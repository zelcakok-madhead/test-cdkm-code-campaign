#!/bin/bash
is_set=$(cat .git/config | grep \"template\")
if [ -z "$is_set" ]; then
    git remote add template git@github.com:madheadapp/tos-ecs-cdk-template.git
fi
git fetch template
git merge template/main --allow-unrelated-histories