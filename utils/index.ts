import { readFileSync, existsSync } from 'fs';
import * as yaml from 'js-yaml';
import { ECSClusterSpec } from './interface';

const CLUSTER_PATH = `${__dirname}/../ecs-cluster.yaml`;

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