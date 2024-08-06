# cdk-managed-ecs-alb.template

## [ Cluster name here ]
### Description
[Cluster Description here]
### Trigger(s)
[Cluster Trigger(s) here]
### Deployment
[Cluster Deployment here]

## Remote to container
### Prerequisite
1. AWS CLI
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
      log:
        retentionDuration: null # Default ONE_MONTH. for available keys [see log group section]
      vpc:
        maxAzs: 2
        targetVPCId: null
        dedicatedVPC: "10.20.0.0/16"
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
3. Define the policies in `/configs/policies.yaml`.
    ```yaml
    # Example
    secretsmanager:
      GetSecretValue:
        resources:
        - "secret Arn 1"
        - "secret Arn 2"    
    ```    
4. Define the environment variables in `/configs/env.yaml`.
    ```yaml
    # Example
    vars:
      "<key 1>": "<value 1>"
      "<key 2>": "<value 2>"
    ```    
5. Run `npm run build` to build typescript files.
6. Run `cdk deploy` to deploy.

## Git Actions Integration
1. Edit `.github/workflows/main.yaml`.
2. Replace `UPDATE_BRANCH_NAME_HERE` variable with the target branch name.
    ```bash
    # Example
    on:
      push:
        branches:
          - main
        paths:
          ...
      pull_request:
        branches:
          - main
        paths:
          ...          
    ```
3. Replace UPDATE_ENVIRONMENT_NAME_HERE variable with the target environment name.
    ```bash
    # Example
    jobs:
    cdk-deploy:
      runs-on: ubuntu-latest
      environment: dev
    ```
4. Set the Git Actions secrets.
    ```bash
    - name: Configure AWS credentials
      uses: aws-actions/configure-aws-credentials@v3
      with:
        role-to-assume: ${{ secrets.AWS_ROLE_ID }}
        aws-region: ${{ secrets.AWS_REGION }}
    ```
5. Setup the environment secrets on Github.
6. Git push to trigger Git Actions

## Deploy to multiple environment
1. Copy `.github/workflows/main.yaml` to `.github/workflows/{branch-name}.yaml`
2. Replace `UPDATE_BRANCH_NAME_HERE` variable with the target branch name.
    ```bash
    # Example
    on:
      push:
        branches:
          - {branch-name}
        paths:
          ...
      pull_request:
        branches:
          - {branch-name}
        paths:
          ...          
    ```
3. Replace UPDATE_ENVIRONMENT_NAME_HERE variable with the target environment name.
    ```bash
    # Example
    jobs:
    cdk-deploy:
      runs-on: ubuntu-latest
      environment: dev
    ```    
4. Update and set the Git Actions secrets.
    ```bash
    - name: Configure AWS credentials
      uses: aws-actions/configure-aws-credentials@v3
      with:
        role-to-assume: ${{ secrets.AWS_ROLE_ID }}
        aws-region: ${{ secrets.AWS_REGION }}  
    ```  
5. Setup the environment secrets on Github.
6. Git push to trigger Git Actions

## Log Group
```bash
# Retention Durations

ONE_DAY          # 1 day
THREE_DAYS       # 3 days
FIVE_DAYS        # 5 days
ONE_WEEK         # 1 week
TWO_WEEKS        # 2 weeks
ONE_MONTH        # 1 month
TWO_MONTHS       # 2 months
THREE_MONTHS     # 3 months
FOUR_MONTHS      # 4 months
FIVE_MONTHS      # 5 months
SIX_MONTHS       # 6 months
ONE_YEAR         # 1 year
THIRTEEN_MONTHS  # 13 months
EIGHTEEN_MONTHS  # 18 months
TWO_YEARS        # 2 years
THREE_YEARS      # 3 years
FIVE_YEARS       # 5 years
SIX_YEARS        # 6 years
SEVEN_YEARS      # 7 years
EIGHT_YEARS      # 8 years
NINE_YEARS       # 9 years
TEN_YEARS        # 10 years
INFINITE         # Retain logs forever
```