#!/bin/bash

# -e Exit imediatly if a comand exit with non-zero status
# -x Print commands and their arguments as they are executed

# Debug mode
if [ ! -z "${DEBUG+x}" ]; then
    set -x
fi

export KAKKA_WS_CONNECTION_RETRY_COUNT=${KAFKA_WS_APP_CONNECTION_RETRY_COUNT:-"5"}
export KAFKA_WS_CONNECTION_RETRY_TIMEOUT=${KAFKA_WS_CONNECTION_RETRY_TIMEOUT:-"3"}

export KAFKA_WS_CONSUMER_METADATA_BROKER_LIST=${KAFKA_WS_CONSUMER_METADATA_BROKER_LIST:-"kafka:9092"}

# Redis parameters
readonly REDIS_CONN_TIMEOUT=${REDIS_CONN_TIMEOUT:-"180"}
readonly REDIS_HOST=${REDIS_HOST:-"redis"}
readonly REDIS_PORT=${REDIS_PORT:-"6379"}
readonly REDIS_PASSWD=${REDIS_PASSWD:-""}

has_responded=false

# Split kafka brokers by comma
readonly KAFKA_BROKERS=${KAFKA_WS_CONSUMER_METADATA_BROKER_LIST//,/ }
for ((i = 0; (i < ${KAKKA_WS_CONNECTION_RETRY_COUNT}); i++));
do
    for address in ${KAFKA_BROKERS};
    do
        address_splited=($(echo ${address} | tr ":" "\n"))
        echo "$((${i} + 1)) - Trying to connect with *${address_splited[0]}* on port *${address_splited[1]}*"

        # output 0 if port is open and 1 if it's closed
        response=$(nc -zv ${address_splited[0]} ${address_splited[1]} &> /dev/null; echo $?)

        if [ "${response}" == 0 ]; then
            has_responded=true
            break
        fi
    done

    if [ "$has_responded" == true ]; then
        break
    fi

    sleep ${KAFKA_WS_CONNECTION_RETRY_TIMEOUT}
done

if [ "$has_responded" == false ]; then
    echo "No Kafka brokers available, exiting ..."
    exit 1
fi
echo -e "Connection established with **${address_splited[0]}** on port **${address_splited[1]}**\n"

# REDIS CONNECTION CHECK

# Waiting for redis for at most 3 minutes
START_TIME=$(date +'%s')
echo "Waiting for Redis fully start. Host '${REDIS_HOST}', '${REDIS_PORT}'..."
echo "Try ping Redis... "
PONG=$(redis-cli -h "${REDIS_HOST}" -p "${REDIS_PORT}" -a "${REDIS_PASSWD}" ping | grep PONG)
while [ -z "${PONG}" ]; do
    sleep 3
    echo "Retry Redis ping... "
    PONG=$(redis-cli -h "${REDIS_HOST}" -p "${REDIS_PORT}" -a "${REDIS_PASSWD}" ping | grep PONG)

    ELAPSED_TIME=$(($(date +'%s') - ${START_TIME}))
    if [ "${ELAPSED_TIME}" -gt "${REDIS_CONN_TIMEOUT}" ]
    then
        echo "Redis is taking too long to fully start. Exiting!"
        exit 1
    fi
done
echo "Redis at host '${REDIS_HOST}', port '${REDIS_PORT}' fully started."

exec "$@"
