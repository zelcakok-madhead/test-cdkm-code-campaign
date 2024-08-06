import * as iam from 'aws-cdk-lib/aws-iam';
import { Effect } from "aws-cdk-lib/aws-iam";

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
    autoscaling?: {
        maxCapacity: number;
        minCapacity: number;
        metrics: Metrics;
    }
}

export type ECSClusterSpec = {
    cluster: {
        name: string;
        log: {
            retentionDuration?: string;
        };
        vpc: {
            ipAddresses: string;
            maxAzs?: number;
        };
        taskDefinitions: {
            [key: string]: TaskDefinition;
        };
        containers: {
            [key: string]: ContainerSpec;
        };
        services: {
            [key: string]: ServiceSpec;
        };
        routes: {
            default: string,
            [key: string]: string;
        }
    }
}

export type Policy = {
    [key: string]: {
        effect: Effect;
        actions: string[];
        resources: string[];
        statement: iam.PolicyStatement | null;
    }
}

export type EnvironmentSpec = {
    [key: string]: string;
}