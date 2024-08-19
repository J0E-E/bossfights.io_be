#!/bin/bash

# Test if the service is running by checking the port (e.g., 8080)
PORT=8080
echo "Checking if the service is running on port $PORT..."

if nc -z localhost $PORT; then
    echo "Service is running on port $PORT."
else
    echo "Service is not running on port $PORT. Exiting with status 1."
    exit 1
fi