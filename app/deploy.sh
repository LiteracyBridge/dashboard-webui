#!/usr/bin/env bash

target="s3://dashboard-lb-stats"

function usage() {
    echo "Error! Must specify subdirectory or '--prod'"
}

# We would like to sync only the directories and files here.
# Unfortunately, the s3 cli doesn't honor the --exclude flag when performing a --delete.
# So, we just copy it all there. We could delete it all from time to time.

sub=
if [ ! -z $1 ]; then
    if [ "$1" != "--prod" ]; then
        sub="$1"
        if [ ${sub:0:1} == "-" ]; then
            usage
            exit 1
        fi
        if [ ${sub:0:1} != "/" ]; then sub="/${sub}"; fi
    fi
    printf "Copying to ${target}${sub}\n\n"
else
    usage 
    exit 1
fi

aws s3 sync --exclude '.*' --exclude 'uf/*' --exclude 'data/*' --exclude '*.sh' . ${target}${sub}
