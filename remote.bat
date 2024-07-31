@echo off
setlocal enabledelayedexpansion

set CLUSTER_NAME=%1
set SERVICE_NAME=%2

:: Function to show menu
:show_menu
echo.
echo Please select a task to remote:
echo.
set counter=0
for %%i in (%TASK_ARNS%) do (
    for /f "tokens=3 delims=/" %%j in ("%%i") do (
        set TASK_ID=%%j
        echo !counter!) !TASK_ID!
        set /a counter+=1
    )
)
echo.
goto :eof

:: Function to remote
:remote
set arn=!TASK_ARN_ARRAY[%choice%]!
for /f "tokens=3 delims=/" %%i in ("!arn!") do (
    set taskID=%%i
)
aws ecs execute-command ^
    --cluster %CLUSTER_NAME% ^
    --task !taskID! ^
    --container %SERVICE_NAME% ^
    --command "cmd" ^
    --interactive
goto :eof

:: Main function
:main
:: List tasks for the specified service
for /f "tokens=*" %%i in ('aws ecs list-tasks --cluster %CLUSTER_NAME% --service-name %SERVICE_NAME% --query "taskArns[]" --output text') do (
    set TASK_ARNS=%%i
)

:: Convert space-separated string to array
setlocal enabledelayedexpansion
set TASK_ARN_ARRAY=()
for %%i in (%TASK_ARNS%) do (
    set TASK_ARN_ARRAY=!TASK_ARN_ARRAY! %%i
)

:: Check if there are any tasks
if "%TASK_ARNS%"=="" (
    echo.
    echo No tasks found for service %SERVICE_NAME% in cluster %CLUSTER_NAME%.
    echo.
    exit /b 1
)

:: Skip select if len = 1
set len=0
for %%i in (%TASK_ARNS%) do (
    set /a len+=1
)
if %len%==1 (
    set choice=0
    call :remote
    exit /b 0
) else (
    :: Main loop
    :loop
    call :show_menu
    set /p choice=Enter the number: 
    call :remote
    exit /b 0
)

goto :eof

call :main