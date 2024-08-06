import * as yaml from 'js-yaml';
import * as iam from 'aws-cdk-lib/aws-iam';
import { readFileSync, existsSync } from 'fs';
import { ECSClusterSpec, EnvironmentSpec, Policy } from './interface';

const CLUSTER_PATH = `${__dirname}/../ecs-cluster.yaml`;
const POLICIES_PATH = `${__dirname}/../configs/policies.yaml`;
const ENV_PATH = `${__dirname}/../configs/env.yaml`;

const configToJSON = (path: string): any => {
    if (existsSync(path)) {
        const config = readFileSync(path).toString();
        if (config.length) {
            return yaml.load(config)
        }
        throw Error(`Error: ${path} not found`);
    }
    throw Error(`Error: ${path} not found`);
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
