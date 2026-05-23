#!/bin/bash

IFACE=$(ip route get 1.1.1.1 2>/dev/null | grep -oP 'dev \K\S+')

if [ -z "$IFACE" ]; then
  echo "Error: could not detect network interface"
  exit 1
fi

echo "→ Interface: $IFACE"

sudo apt install -y ethtool

# Enable WoL immediately
sudo ethtool -s "$IFACE" wol g

# Create systemd service to re-enable WoL on every boot
sudo tee /etc/systemd/system/wol@.service > /dev/null <<EOF
[Unit]
Description=Wake-on-LAN for %i
After=network.target

[Service]
Type=oneshot
ExecStart=/sbin/ethtool -s %i wol g

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable --now "wol@${IFACE}.service"

echo ""
echo "Wake-on-LAN enabled on $IFACE"
echo "MAC: $(cat /sys/class/net/$IFACE/address)"
