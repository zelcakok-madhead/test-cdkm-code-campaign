# cdk-managed-ecs-alb.template

## [ Cluster name here ]
### Description
[Cluster Description here]
### Trigger(s)
[Cluster Trigger(s) here]
### Deployment
[Cluster Deployment here]

## Upgrade Template
| Platforms      | Script                |
| -------------- | --------------------- |
| Windows        | upgrade-template.bat  |
| Linux + Mac OS | upgrade-template.bash |

## Steps
1. Run `npm install`. # Install the CDK libraries
2. Edit ecs-cluster.yaml.
    ```yaml
    # Example
    cluster:
        name: sample
        vpc:
            maxAzs: 2
        taskDefinitions:
            nginx:
                memoryLimitMiB: 512
                cpu: 256
        containers:
            nginx:
                ecrRepoName: cdk-demo
                port: 80
                healthCheck:
                    command: ["CMD-SHELL", "curl -f http://localhost/ || exit 1"]
                    interval: 30
                    timeout: 5
                    retries: 3
                    startPeriod: 60
        services:
            nginx:
                desiredCount: 1
                autoscaling: # Remove this part if no autoscaling
                    maxCapacity: 1
                    minCapacity: 0
                    metrics:
                        cpu:
                            targetUtilizationPercent: 50
                            scaleInCooldown: 60
                            scaleOutCooldown: 60
                        memory:
                            targetUtilizationPercent: 50
                            scaleInCooldown: 60
                            scaleOutCooldown: 60
                        request:
                            requestPerTarget: 10
                            scaleInCooldown: 60
                            scaleOutCooldown: 60                    
        routes:
            default:
                response: "Default response"
            nginx: /nginx
    ```
3. Run `npm run build` to build typescript files.
4. Run `cdk deploy` to deploy.


## Remote to container
### Prerequisite
1. AWS Cli
   * https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html
2. Install the Session Manager plugin for the AWS CLI
   * https://docs.aws.amazon.com/systems-manager/latest/userguide/session-manager-working-with-install-plugin.html

### Scripts

| Platforms      | Script                                    | Example                  |
| -------------- | ----------------------------------------- | ------------------------ |
| Windows        | remote.bat [cluster name] [service name]  | remote.bat sample nginx  |
| Linux + Mac OS | remote.bash [cluster name] [service name] | remote.bash sample nginx |

```bash
# Connect to container automatically if there is only one task.

The Session Manager plugin was installed successfully. Use the AWS CLI to start a session.


Starting session with SessionId: ecs-execute-command-zxz4vmjdr4i2iswz4wc7fnk7ke
root@ip-10-0-3-168:/# 

# Select the task to remote if there are more than one task.

Please select a task to remote:

0) 774e3d342b7647098ce206c89e63fe01
1) 909sd8f09sdf09sd8f09sdf9sdf8u989

Enter the number: 1

The Session Manager plugin was installed successfully. Use the AWS CLI to start a session.


Starting session with SessionId: ecs-execute-command-4xloetrh7yjw2l4ezsgz4znt2m
root@ip-10-0-3-168:/# 
```