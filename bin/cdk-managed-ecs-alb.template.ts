#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { CdkManagedEcsAlbTemplateStack } from '../lib/cdk-managed-ecs-alb.template-stack';
import { clusterNameFromSpec } from '../utils';

const app = new cdk.App();
new CdkManagedEcsAlbTemplateStack(app, clusterNameFromSpec());