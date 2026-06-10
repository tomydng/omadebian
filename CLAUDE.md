# Omadebian

Một script tự động cài đặt và cấu hình môi trường phát triển trên Debian 13+ (Trixie/Sid). Cài bằng một lệnh duy nhất.

## Cài đặt

```bash
eval "$(wget -qO- https://raw.githubusercontent.com/tomydng/omadebian/main/boot.sh)"
```

`boot.sh` clone repo vào `~/.local/share/omadebian/` rồi chạy `install.sh`.

**Yêu cầu:** Debian 13+ x86_64, GNOME desktop, user có `sudo`, zsh đã cài.

## Cấu trúc thư mục

```
omadebian/
├── boot.sh                   # Entry point – clone repo + chạy install.sh
├── install.sh                # Orchestrator: detect GNOME, chạy terminal.sh + desktop.sh
├── install/
│   ├── check-version.sh      # Kiểm tra Debian version + kiến trúc x86
│   ├── terminal.sh           # Cài terminal tools theo thứ tự cố định, dùng run() helper
│   ├── desktop.sh            # Cài desktop apps + GNOME config, dùng run() helper
│   ├── terminal/
│   │   ├── a-shell.sh        # Copy inputrc
│   │   ├── docker.sh         # Docker CE via APT
│   │   ├── fonts.sh          # CaskaydiaMono Nerd Font
│   │   ├── mise.sh           # mise (language version manager)
│   │   ├── app-github-cli.sh
│   │   ├── app-neovim.sh     # Download từ GitHub + copy transparency.lua
│   │   ├── app-starship.sh   # Install starship (config managed by dotfiles)
│   │   ├── app-lazygit.sh
│   │   ├── app-lazydocker.sh
│   │   ├── app-zellij.sh
│   │   ├── app-kubectl.sh
│   │   ├── app-tailscale.sh
│   │   └── app-fcitx5-unikey.sh  # Vietnamese input (fcitx5 + unikey)
│   └── desktop/
│       ├── a-flatpak.sh      # Flatpak + Flathub – phải chạy trước các app flatpak
│       ├── app-ghostty.sh    # Ghostty qua ghostty-debian APT repo
│       ├── app-alacritty.sh  # Alacritty + copy configs
│       ├── app-firefox.sh    # Firefox qua Mozilla APT repo
│       ├── app-brave.sh
│       ├── app-chrome.sh
│       ├── app-vscode.sh     # VSCode qua Microsoft APT repo
│       ├── app-zed.sh
│       ├── app-lens-k8s.sh
│       ├── app-localsend.sh
│       ├── ulauncher.sh
│       ├── set-gnome-settings.sh  # Font, center windows, performance mode, no suspend
│       ├── set-gnome-hotkeys.sh   # Custom keybindings (8 slots)
│       ├── set-gnome-extensions.sh
│       └── set-dock.sh
├── configs/                  # App configs KHÔNG do dotfiles quản lý
│   ├── alacritty/            # Multi-file alacritty config
│   ├── fcitx5/               # fcitx5 config + profile
│   ├── neovim/               # transparency.lua, snacks-animated-scrolling-off.lua
│   ├── btop.conf
│   ├── fastfetch.jsonc
│   ├── inputrc
│   ├── ulauncher.desktop
│   ├── ulauncher.json
│   ├── vscode.json
│   └── zellij.kdl
├── defaults/                 # zsh defaults (shell, rc, aliases, functions, init)
├── applications/             # GNOME .desktop shortcuts + icons
└── scripts/
    ├── setup-folders.sh      # Tạo cấu trúc thư mục workspaces
    ├── setup-wol.sh          # Bật Wake-on-LAN + tạo systemd service
    ├── no-suspend.sh         # Mask sleep targets + logind override, dùng cho máy headless/WOL
    ├── sync-org.sh
    ├── toggle_panel.sh       # Toggle GNOME top bar (dùng bởi Shift+Super+Space)
    └── toggle-touchpad.sh    # Toggle touchpad on/off (bind vào Ctrl+Super+T)
```

## Thiết kế

- **Không có prompts** — install chạy tự động hoàn toàn, không hỏi gì
- **Mỗi script chạy như subprocess** (`bash script.sh`, không `source`) — lỗi ở script con không làm chết toàn bộ install
- **`run()` helper** trong terminal.sh/desktop.sh: log tên script, bắt lỗi, tiếp tục
- **`OMADEBIAN_PATH`** tự detect từ `BASH_SOURCE[0]` — không hardcode path
- **configs/** chỉ chứa những gì dotfiles không quản lý. Configs cá nhân (zshrc, ghostty, starship, ripgrep, nvim init.lua, git) do [dotfiles repo](https://github.com/tomydng/dotfiles) quản lý qua symlink

## Thêm app mới

**Terminal tool:** Thêm script vào `install/terminal/`, gọi `run "$OMADEBIAN_PATH/install/terminal/app-<name>.sh"` trong `terminal.sh` đúng vị trí.

**Desktop app:** Tương tự với `install/desktop/` và `desktop.sh`.

**App 1 lệnh (apt/flatpak):** Inline thẳng vào `terminal.sh` hoặc `desktop.sh`, không cần tạo file riêng.

## Pattern APT repo bên thứ ba

```bash
if [ ! -f /etc/apt/sources.list.d/<name>.list ]; then
  curl -fsSL <gpg-url> | sudo gpg --dearmor -o /usr/share/keyrings/<name>.gpg
  echo "deb [signed-by=/usr/share/keyrings/<name>.gpg] <repo-url> $(lsb_release -sc) main" \
    | sudo tee /etc/apt/sources.list.d/<name>.list
fi
sudo apt update && sudo apt install -y <package>
```

## Gotchas

- **`resolvconf`**: Đừng cài — conflict với systemd-resolved trên Debian GNOME, làm hỏng DNS
- **fcitx5**: Dùng `fcitx5-frontend-all` (Debian). `fcitx5-gtk` và `fcitx5-qt` là package của Arch
- **Super+Space**: Phải clear `switch-input-source` trước khi gán cho Ulauncher
- **fcitx5 global**: Chỉ hoạt động trong text field trên GNOME Wayland — limitation đã chấp nhận
