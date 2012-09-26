#!/bin/bash

DEPLOY_DIR="/home/edwinfuquen/worker-manager"
DEPLOY_SSH="edwinfuquen@notifications.nyc.dev.fs.lsops.org"

scp app.js $DEPLOY_SSH:$DEPLOY_DIR &
scp package.json $DEPLOY_SSH:$DEPLOY_DIR &

wait

scp workers/*.js $DEPLOY_SSH:$DEPLOY_DIR/tmp/
ssh $DEPLOY_SSH "mv $DEPLOY_DIR/tmp/* $DEPLOY_DIR/workers/nodejs/"
ssh $DEPLOY_SSH "rm -f $DEPLOY_DIR/tmp/*"

scp workers/*.rb $DEPLOY_SSH:$DEPLOY_DIR/tmp/
ssh $DEPLOY_SSH "mv $DEPLOY_DIR/tmp/* $DEPLOY_DIR/workers/ruby/"
ssh $DEPLOY_SSH "rm -f $DEPLOY_DIR/tmp/*"

scp config/workers/*.json $DEPLOY_SSH:$DEPLOY_DIR/tmp/
ssh $DEPLOY_SSH "mv $DEPLOY_DIR/tmp/* $DEPLOY_DIR/config/workers/"
ssh $DEPLOY_SSH "rm -f $DEPLOY_DIR/tmp/*"
