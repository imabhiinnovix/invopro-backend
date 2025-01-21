#!/usr/bin/env bash

# Running Startup Script for reportify-backend for dev environment
echo "############################################################"
echo "Starting Backend at $(date) NODE_ENV=${NODE_ENV}"

echo "------------------------------"
echo "Install npm Packages: yarn"
yarn

echo "------------------------------"
echo "Seed Database: yarn seed:dev"
yarn seed:dev

echo "------------------------------"
echo "Start main Process: yarn dev"
yarn dev
