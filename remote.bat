@echo off
setlocal enabledelayedexpansion

set "CLUSTER_NAME=%1"
set "SERVICE_NAME=%2"

REM Function to show menu
:show_menu
echo.
echo Please select a task to remote:
echo.

set counter=0
for /F "tokens=*" %%A in ('aws ecs list-tasks --cluster %CLUSTER_NAME% --service-name %SERVICE_NAME% --query "taskArns[]" --output text') do (
    set "TASK_ARN=%%A"
    for /F "tokens=*" %%B in ('echo !TASK_ARN! ^| awk -F"/" "{print $NF}"') do (
        set "TASK_ID=%%B"
        echo !counter^) !TASK_ID!
        set /A counter+=1
    )
)
echo.

REM Function to remote
:remote
set "arn=!TASK_ARN_ARRAY[%choice%]!"
for /F "tokens=*" %%A in ('echo !arn! ^| awk -F"/" "{print $NF}"') do (
    set "taskID=%%A"
)
aws ecs execute-command --cluster %CLUSTER_NAME% --task %taskID% --container %SERVICE_NAME% --command "cmd" --interactive
goto :eof

REM Main function
:main
REM List tasks for the specified service
set TASK_ARN_ARRAY=
for /F "tokens=*" %%A in ('aws ecs list-tasks --cluster %CLUSTER_NAME% --service-name %SERVICE_NAME% --query "taskArns[]" --output text') do (
    set "TASK_ARN_ARRAY=!TASK_ARN_ARRAY! %%A"
)

REM Check if there are any tasks
if "%TASK_ARN_ARRAY%"=="" (
    echo.
    echo No tasks found for service %SERVICE_NAME% in cluster %CLUSTER_NAME%.
    echo.
    exit /B 1
)

REM Skip select if len = 1
for /F "tokens=*" %%A in ('echo %TASK_ARN_ARRAY%') do (
    set "TASK_COUNT=%%A"
)

if "%TASK_COUNT%"=="1" (
    set choice=0
    call :remote
    exit /B 0
) else (
    REM Main loop
    :menu_loop
    call :show_menu
    set /P "choice=Enter the number: "
    call :remote
    exit /B 0
)
goto :eof

call :main