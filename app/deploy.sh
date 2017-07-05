#!/usr/bin/env bash

# We would like to sync only the directories and files here.
# Unfortunately, the s3 cli doesn't honor the --exclude flag when performing a --delete.
# So, we just copy it all there. We could delete it all from time to time.

aws s3 sync --exclude '.*' --exclude 'uf/*' --exclude 'data/*' --exclude '*.sh' . s3://dashboard-lb-stats
