-module(utils).
-import(lists,[member/2]).

% time defined in miliseconds (default 30 min)
-define(MAX_TIMEOUT, element(1, string:to_integer(os:getenv("PLUGIN_DISC_LIFETIME_SESSION", "1800000")))).

-export([
    set_connection_timeout/2,
    disconnect_client/1,
    is_dojot_user/1,
    cancel_connection_timeout/2,
    return_ets/0
]).

return_ets() -> 
    case member(?MODULE, ets:all()) of
        false ->
             ets:new(?MODULE, [public, named_table])
     end,
     % return the table ID
     ets:whereis(?MODULE).

is_dojot_user(Username) ->

    % we will split the username. If dojot username is tenant:deviceid
    % the length of list will always 2. If not, it will not be dojot user.
    Res = binary:split(Username, <<":">>, [global]),
    case length(Res) of
        2 ->
            is_user;
        _->
            not_user
    end.

disconnect_client(SubId) ->
    error_logger:info_msg("disconnect_client: ~p ~n", [SubId]),
    vernemq_dev_api:disconnect_by_subscriber_id(SubId, []).

set_connection_timeout(SubId, Table) ->
    { _, Tref } = timer:apply_after(?MAX_TIMEOUT, ?MODULE, disconnect_client, [SubId]),
    { _, ClientId } = SubId,
    ets:insert(Table, { ClientId, [Tref] }),
    ok.

cancel_connection_timeout(SubId, Table) ->
    { _, ClientId } = SubId,

    try
        ets:lookup(Table, ClientId),
        timer:cancel(timerId)
    catch
    error:badarg->
        ok
    end.