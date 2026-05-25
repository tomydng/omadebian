#!/bin/bash

# Mask systemd sleep targets so nothing can trigger suspend/hibernate
sudo systemctl mask sleep.target suspend.target hibernate.target hybrid-sleep.target

# Tell logind to ignore ACPI suspend/hibernate keys and never idle-suspend
sudo mkdir -p /etc/systemd/logind.conf.d
sudo tee /etc/systemd/logind.conf.d/no-suspend.conf > /dev/null <<'EOF'
[Login]
HandleSuspendKey=ignore
HandleHibernateKey=ignore
IdleAction=ignore
EOF

sudo systemctl restart systemd-logind

echo "Suspend/sleep fully disabled."
