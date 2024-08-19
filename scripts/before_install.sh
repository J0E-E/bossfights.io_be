#!/bin/bash

# Stop the existing Node.js application
echo "Stopping existing Node.js application..."
pkill node || true

# Clean up old files
echo "Cleaning up old application files..."
rm -rf /home/ec2-user/myapp/*