import * as cdk from 'aws-cdk-lib';
import * as yaml from 'js-yaml';
import * as iam from 'aws-cdk-lib/aws-iam';
import { readFileSync, existsSync } from 'fs';
import { ECSClusterSpec, EnvironmentSpec, Policy } from './interface';
import { SubnetType, Vpc, IpAddresses } from 'aws-cdk-lib/aws-ec2';

const CLUSTER_PATH = `${__dirname}/../ecs-cluster.yaml`;
const POLICIES_PATH = `${__dirname}/../configs/policies.yaml`;
const ENV_PATH = `${__dirname}/../configs/env.yaml`;

const configToJSON = (path: string, options: { required: boolean } = { required: false }): any => {
    if (existsSync(path)) {
        const config = readFileSync(path).toString();
        if (config.length) {
            return yaml.load(config)
        } else if (options.required) {
            throw Error(`Error: ${path} not found`);
        }
    } else if (options.required) {
        throw Error(`Error: ${path} not found`);
    }
}

const getTargetVPC = (ctx: cdk.Stack, ecsSpec: ECSClusterSpec): cdk.aws_ec2.IVpc => {
    // Lookup the target VPC
    return Vpc.fromLookup(ctx, 'target-lambda-vpc', {
        vpcId: ecsSpec.cluster.vpc.targetVPCId,
    });
}

const getDedicatedVPC = (ctx: cdk.Stack, ecsSpec: ECSClusterSpec): cdk.aws_ec2.IVpc => {
    // Create the dedicated VPC
    return new Vpc(ctx, 'dedicated-vpc', {
        ipAddresses: IpAddresses.cidr(ecsSpec.cluster.vpc.dedicatedVPC!),
        natGateways: 1,
        maxAzs: ecsSpec.cluster.vpc.maxAzs || 2,
        subnetConfiguration: [
            {
                name: `${ecsSpec.cluster.name}-dedicated-vpc-for-nat`, // For NAT gateway
                subnetType: SubnetType.PUBLIC,
                cidrMask: 24,
            },
            {
                name: `${ecsSpec.cluster.name}-dedicated-vpc`,
                subnetType: SubnetType.PRIVATE_WITH_EGRESS,
                cidrMask: 24,
            },
        ],
    });
}

export const clusterConfigToSpec = (): ECSClusterSpec => {
    return configToJSON(CLUSTER_PATH);
}

export const clusterNameFromSpec = (): string => {
    const { cluster: config } = configToJSON(CLUSTER_PATH);
    return `cdk-managed-${config.name!}-ecs-stack`;
}

export const policiesConfigToIAMPolicyStatements = () => {
    const policies = configToJSON(POLICIES_PATH);
    const template: Policy = {};
    for (const service in policies) {
        if (!template?.[service]) {
            template[service] = {
                effect: iam.Effect.ALLOW,
                actions: [],
                resources: [],
                statement: null
            }
        }
        for (const action in policies[service]) {
            template[service].actions.push(`${service}:${action}`);
            template[service].resources = policies[service][action].resources;
        }
        template[service].statement = new iam.PolicyStatement(template[service]);
    }
    return template
}

export const environmentConfigToSpec = (): EnvironmentSpec => {
    const envVars = configToJSON(ENV_PATH);
    if (!envVars) {
        return {};
    }
    const { vars } = envVars;
    if (!vars) {
        return {};
    }
    const template: EnvironmentSpec = {};
    for (const [k, v] of Object.entries(vars)) {
        template[k] = `${v}`;
    }
    return template;
}

export const getECSVPC = (ctx: cdk.Stack, ecsSpec: ECSClusterSpec): cdk.aws_ec2.IVpc => {
    const { targetVPCId, dedicatedVPC } = ecsSpec.cluster.vpc;
    if (!targetVPCId && !dedicatedVPC) {
        throw Error("Error: Please specify at least one VPC");
    }
    if (dedicatedVPC) {
        return getDedicatedVPC(ctx, ecsSpec);
    }
    return getTargetVPC(ctx, ecsSpec);
}