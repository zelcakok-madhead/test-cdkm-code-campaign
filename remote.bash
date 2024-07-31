#!/bin/bash
CLUSTER_NAME=$1
SERVICE_NAME=$2

function show_menu() {
    echo -e "\nPlease select a task to remote:\n"
    counter=0
    for TASK_ARN in $TASK_ARNS; do
        TASK_ID=$(echo $TASK_ARN | awk -F'/' '{print $NF}')
        echo -e "$counter) $TASK_ID\n"
        counter=$counter+1
    done
}

function remote() {
    arn=${TASK_ARN_ARRAY[$choice]}
    taskID=$(echo $arn | awk -F'/' '{print $NF}')
    aws ecs execute-command \
        --cluster $CLUSTER_NAME \
        --task $taskID \
        --container $SERVICE_NAME \
        --command "bash" \
        --interactive
}

function main() {
    # List tasks for the specified service
    TASK_ARNS=$(aws ecs list-tasks --cluster $CLUSTER_NAME --service-name $SERVICE_NAME --query "taskArns[]" --output text)
    IFS=' ' read -r -a TASK_ARN_ARRAY <<<"$TASK_ARNS"

    # Check if there are any tasks
    if [ -z "$TASK_ARNS" ]; then
        echo -e "\nNo tasks found for service $SERVICE_NAME in cluster $CLUSTER_NAME.\n"
        exit 1
    fi

    # Skip select if len = 1
    if [ 0 || ${#TASK_ARN_ARRAY[@]} -eq 1 ]; then
        choice=0
        remote
        exit 0
    else
        # Main loop
        while true; do
            show_menu
            read -p "Enter the number: " choice
            remote
            exit 0
        done
    fi
}

main
