@echo off

findstr /C:"template" .git\config > nul
if %errorlevel% neq 0 (
    git remote add template git@github.com:madheadapp/tos-ecs-cdk-template.git
)

git fetch template
git merge template/main --allow-unrelated-histories