export type HealthCheck = {
    command: string[];
    interval?: number
    timeout?: number;
    retries?: number;
    startPeriod?: number;
}

export type TaskDefinition = {
    memoryLimitMiB: number;
    cpu: number;
}

export type ContainerSpec = {
    ecrRepoName: string;
    port: number;
    healthCheck: HealthCheck;
}

interface MetricSpec {
    scaleInCooldown: number;
    scaleOutCooldown: number;
}

export interface ResourceMetric extends MetricSpec {
    targetUtilizationPercent: number;
}

export interface RequestMetricSpec extends MetricSpec {
    requestPerTarget: number;
}

export type Metrics = {
    cpu?: ResourceMetric;
    memory?: ResourceMetric;
    request?: RequestMetricSpec;
}

export type ServiceSpec = {
    desiredCount: number;
    autoscaling?: {
        maxCapacity: number;
        minCapacity: number;
        metrics: Metrics;
    }
}

export type ECSClusterSpec = {
    cluster: {
        name: string;
        vpc: {
            ipAddresses: string;
            maxAzs?: number;
        },
        taskDefinitions: {
            [key: string]: TaskDefinition;
        },
        containers: {
            [key: string]: ContainerSpec;
        },
        services: {
            [key: string]: ServiceSpec;
        },
        routes: {
            default: string,
            [key: string]: string;
        }
    }
}