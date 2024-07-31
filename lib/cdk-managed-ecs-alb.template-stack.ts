import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';
import { clusterConfigToSpec } from '../utils';
import { ECSClusterSpec, Metrics, ResourceMetric } from '../utils/interface';

export class CdkManagedEcsAlbTemplateStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Load ecs-cluster.yaml file
    const config: ECSClusterSpec = clusterConfigToSpec();
    const { name, vpc, taskDefinitions, containers, services, routes } = config.cluster;

    // Create log group
    const logGroup = new logs.LogGroup(this, `${name}-loggrp`, {
      logGroupName: `/ecs/${name}-log-group`,
      retention: logs.RetentionDays.ONE_MONTH,
      removalPolicy: cdk.RemovalPolicy.DESTROY // Optional: delete the log group when the stack is destroyed
    });

    // Create VPC
    const clusterVPC = new ec2.Vpc(this, `${name}-default-vpc`, {
      maxAzs: vpc?.maxAzs || 1,
      subnetConfiguration: [
        {
          cidrMask: 24,
          name: `${name}-nat-subnet`, // For NAT gateway
          subnetType: ec2.SubnetType.PUBLIC,
        },
        {
          cidrMask: 24,
          name: `${name}-subnet`,
          subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS
        },
      ],
    });

    // Create the taskRole for aws exec
    const taskRole = new iam.Role(this, 'TaskRole', {
      roleName: `${name}-task-role`,
      assumedBy: new iam.ServicePrincipal('ecs-tasks.amazonaws.com'),
    });

    // Add the necessary policies
    taskRole.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AmazonECSTaskExecutionRolePolicy'));
    taskRole.addToPolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        "ssmmessages:CreateControlChannel",
        "ssmmessages:CreateDataChannel",
        "ssmmessages:OpenControlChannel",
        "ssmmessages:OpenDataChannel",
        "ecs:ExecuteCommand"
      ],
      resources: ["*"],
    }));

    // Create ECS cluster
    const cluster = new ecs.Cluster(this, `${name}`, { vpc: clusterVPC, clusterName: name });

    // Create Fargate task definition
    const clusterTaskDefinitions: { [key: string]: ecs.FargateTaskDefinition } = {};
    for (const taskName in taskDefinitions) {
      const taskDef = new ecs.FargateTaskDefinition(this, `${name}-${taskName}-task-def`, {
        family: `${name}-${taskName}-tdf`,
        memoryLimitMiB: taskDefinitions[taskName].memoryLimitMiB,
        cpu: taskDefinitions[taskName].cpu,
        taskRole,
      });
      clusterTaskDefinitions[taskName] = taskDef;
    }

    // Add container to task definition
    for (const taskName in containers) {
      const { ecrRepoName, port, healthCheck } = containers[taskName];
      // Import the ECR
      const ecrRepo = ecr.Repository.fromRepositoryName(this, `${name}-${taskName}-ecr`, ecrRepoName);
      // Get the latest image
      const image = ecs.ContainerImage.fromEcrRepository(ecrRepo, 'latest');
      clusterTaskDefinitions[taskName].addContainer(`${name}-${taskName}-container`, {
        containerName: taskName,
        image,
        portMappings: [{ containerPort: port }],
        healthCheck: {
          command: healthCheck.command,
          interval: cdk.Duration.seconds(healthCheck?.interval || 30),
          timeout: cdk.Duration.seconds(healthCheck?.timeout || 5),
          retries: healthCheck?.retries || 3,
          startPeriod: cdk.Duration.seconds(healthCheck?.startPeriod || 60),
        },
        logging: ecs.LogDrivers.awsLogs({
          logGroup,
          streamPrefix: `${name}`
        })
      })
    }

    // Create Fargate service
    let scaling: { [key: string]: ecs.ScalableTaskCount | null } = {};
    const taskNameServices: { [key: string]: ecs.FargateService } = {}
    for (const taskName in services) {
      const { desiredCount, autoscaling } = services[taskName];
      const service = new ecs.FargateService(this, `${name}-${taskName}-service`, {
        serviceName: taskName,
        cluster,
        taskDefinition: clusterTaskDefinitions[taskName],
        desiredCount,
        enableExecuteCommand: true,
      });
      const hasMetric = autoscaling?.metrics !== undefined;
      taskNameServices[taskName] = service;
      if (!hasMetric) {
        continue
      }
      scaling[taskName] = service.autoScaleTaskCount({
        minCapacity: autoscaling!.minCapacity,
        maxCapacity: autoscaling!.maxCapacity,
      });
      for (const metricKey of ['cpu', 'memory']) {
        const metric = autoscaling.metrics?.[metricKey as keyof Metrics]!
        const { targetUtilizationPercent, scaleInCooldown, scaleOutCooldown } = metric as ResourceMetric;
        const spec = {
          policyName: `${name}-${taskName}-as${metricKey}`,
          targetUtilizationPercent: targetUtilizationPercent,
          scaleInCooldown: cdk.Duration.seconds(scaleInCooldown),
          scaleOutCooldown: cdk.Duration.seconds(scaleOutCooldown),
        }
        if (metricKey === "cpu") {
          scaling[taskName].scaleOnCpuUtilization(`${name}-${taskName}-service-autoscale-cpu`, spec);
        } else {
          scaling[taskName].scaleOnMemoryUtilization(`${name}-${taskName}-service-autoscale-memory`, spec);
        }
      }
    }

    // Create Application Load Balancer
    const lb = new elbv2.ApplicationLoadBalancer(this, `${name}-alb`, {
      loadBalancerName: `${name}-alb`,
      vpc: clusterVPC,
      internetFacing: true,
    });
    const listener = lb.addListener(`${name}-http-listener`, { port: 80 });
    listener.addAction(`${name}-lb-default`, {
      action: elbv2.ListenerAction.fixedResponse(200, {
        contentType: 'application/json',
        messageBody: JSON.stringify(routes.default)
      })
    });
    let priority = 1;
    for (const taskName in taskNameServices) {
      const target = listener.addTargets(`${name}-${taskName}-lb-rules`, {
        targetGroupName: `${name}-${taskName}-targrp`,
        port: 80,
        targets: [taskNameServices[taskName]],
        healthCheck: { path: '/' },
        priority: priority++,
        conditions: [
          elbv2.ListenerCondition.pathPatterns([routes[taskName]])
        ]
      });
      if (scaling?.[taskName] && services[taskName].autoscaling?.metrics.request) {
        const { requestPerTarget, scaleInCooldown, scaleOutCooldown } = services[taskName].autoscaling.metrics.request;
        scaling[taskName].scaleOnRequestCount(`${name}-${taskName}-service-autoscale-request`, {
          policyName: `${name}-${taskName}-asreq`,
          requestsPerTarget: requestPerTarget,
          targetGroup: target,
          scaleInCooldown: cdk.Duration.seconds(scaleInCooldown),
          scaleOutCooldown: cdk.Duration.seconds(scaleOutCooldown),
        })
      }
    }

    // Output the ALB DNS name
    new cdk.CfnOutput(this, `${name}-alb-dns`, {
      value: lb.loadBalancerDnsName
    });
  }
}
