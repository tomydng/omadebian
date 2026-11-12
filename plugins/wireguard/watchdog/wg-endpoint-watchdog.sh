#!/bin/bash
# wg-endpoint-watchdog: keep the h3tech tunnel's endpoint in sync with DNS.
#
# WireGuard resolves the Endpoint hostname once at `wg-quick up` and then
# pins that IP forever. When the home public IP rotates (DDNS on
# Cloudflare, refreshed every minute), the client keeps hammering the old
# IP and the tunnel stays dead until someone toggles it manually.
#
# This watchdog resolves the hostname through the home router (DNS that
# does NOT travel through the tunnel) and hot-updates the peer endpoint
# via `wg set` — no tunnel restart, zero downtime when the IP is stable.
set -u

IFACE="h3tech"
DOMAIN="vpn.h3tech.org"
PORT="13231"
PEER_PUBKEY="WJzm3nMDk0EzYRLCJugDyjtfLgrMyNMQymSQJ78hN24="
DNS_SERVER="192.168.1.1"   # home router: resolves outside the tunnel

# Interface down? Nothing to do.
wg show "$IFACE" >/dev/null 2>&1 || exit 0

new_ip=$(dig +short "@$DNS_SERVER" "$DOMAIN" 2>/dev/null |
    grep -E '^[0-9]+(\.[0-9]+){3}$' | head -1)
[ -n "$new_ip" ] || exit 0

current=$(wg show "$IFACE" endpoints 2>/dev/null | awk '{print $2}')
current_ip=${current%%:*}
[ "$new_ip" = "$current_ip" ] && exit 0

wg set "$IFACE" peer "$PEER_PUBKEY" endpoint "$new_ip:$PORT" \
    && logger -t wg-endpoint-watchdog \
        "endpoint updated: ${current_ip:-?} -> $new_ip"
exit 0
