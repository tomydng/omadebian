# Omadebian

Một script tự động cài đặt và cấu hình môi trường phát triển trên Debian 13+ (Trixie/Sid), lấy cảm hứng từ [Omakub](https://omakub.org). Cài bằng một lệnh duy nhất.

## Cài đặt

```bash
eval "$(wget -qO- https://raw.githubusercontent.com/tomydng/omadebian/main/boot.sh)"
```

`boot.sh` clone repo vào `~/.local/share/omadebian/` rồi chạy `install.sh`.

## Cấu trúc thư mục

```
omadebian/
├── boot.sh                        # Entry point – clone repo + chạy install.sh
├── install.sh                     # Orchestrator chính: hỏi lựa chọn, cài terminal/desktop
├── install/
│   ├── first-run-choices.sh       # Gum prompts: optional apps, languages, databases
│   ├── identification.sh          # Git user config
│   ├── check-version.sh           # Kiểm tra Debian version
│   ├── terminal.sh                # Chạy tất cả installer trong install/terminal/*.sh
│   ├── desktop.sh                 # Chạy tất cả installer trong install/desktop/*.sh
│   ├── terminal/                  # Tools CLI: zsh, docker, neovim, zellij, kubectl...
│   │   ├── required/app-gum.sh    # Gum (TUI prompts) – cài trước tiên
│   │   └── optional/              # Tools tuỳ chọn (mise, tldr...)
│   └── desktop/                   # Apps GNOME: alacritty, vscode, chrome, ulauncher...
│       ├── optional/              # Apps tuỳ chọn (ghostty, spotify, 1password...)
│       │   └── app-ghostty.sh     # Cài Ghostty qua APT repo của dariogriffo/ghostty-debian
│       └── select-optional-apps.sh  # Đọc $OMADEBIAN_FIRST_RUN_OPTIONAL_APPS và source từng app
├── configs/                       # Config files được copy vào ~/.config/ khi install
│   ├── ghostty/config             # Ghostty: theme, font, keybinds, pane navigation
│   ├── alacritty/                 # Alacritty multi-file config
│   ├── neovim/                    # Neovim config
│   ├── zshrc, bashrc, starship.toml, zellij.kdl, btop.conf...
├── themes/                        # Colour themes (mặc định: GitHub Dark Default)
├── defaults/                      # Shell dotfiles mặc định (bash/, zsh/)
├── applications/                  # GNOME .desktop shortcuts (About, Docker, Omadebian)
├── scripts/                       # Utility scripts (sync-org.sh, toggle_panel.sh)
├── migrations/                    # Migration scripts theo timestamp
└── uninstall/                     # Uninstall scripts
```

## Thêm app mới

### App optional (cài theo lựa chọn người dùng)
1. Tạo `install/desktop/optional/app-<name>.sh`
2. Thêm tên vào mảng `OPTIONAL_APPS` trong `install/first-run-choices.sh`
3. Config file đặt ở `configs/<name>/`, copy vào `~/.config/<name>/` trong script

### App bắt buộc (cài cho tất cả)
- Đặt script trong `install/desktop/*.sh` hoặc `install/terminal/*.sh`
- Sẽ tự động được chạy vì `desktop.sh` và `terminal.sh` glob toàn bộ `*.sh` trong thư mục

## Pattern cài đặt từ APT repo bên thứ ba

Xem `install/desktop/optional/app-spotify.sh` làm mẫu:
```bash
if [ ! -f /etc/apt/sources.list.d/<repo>.list ]; then
  curl -fsSL <gpg-url> | sudo gpg --dearmor -o /usr/share/keyrings/<name>.gpg
  echo "deb [signed-by=/usr/share/keyrings/<name>.gpg] <repo-url> $(lsb_release -sc) main" \
    | sudo tee /etc/apt/sources.list.d/<name>.list
fi
sudo apt update && sudo apt install -y <package>
```

## Ghostty (ghostty-debian)

Script: `install/desktop/optional/app-ghostty.sh`  
Config: `configs/ghostty/config`

Cài qua APT repo không chính thức của [dariogriffo/ghostty-debian](https://github.com/dariogriffo/ghostty-debian):
- GPG key: `https://debian.griffo.io/EA0F721D231FDD3A0A17B9AC7808B4DD62C41256.asc`
- APT source: `https://debian.griffo.io/apt`
- Hỗ trợ: Debian Bookworm, Trixie, Sid

Config mặc định: theme GitHub Dark Default, font CaskaydiaMono 12, block cursor, Alt+Arrow điều hướng pane.

## Biến môi trường quan trọng

| Biến | Mô tả |
|------|--------|
| `OMADEBIAN_PATH` | Path tới `~/.local/share/omadebian` |
| `OMADEBIAN_FIRST_RUN_OPTIONAL_APPS` | Danh sách optional apps được chọn |
| `OMADEBIAN_FIRST_RUN_LANGUAGES` | Ngôn ngữ lập trình được chọn |
| `OMADEBIAN_FIRST_RUN_DBS` | Databases được chọn |

## Yêu cầu

- Debian 13+ (Trixie) hoặc Sid
- GNOME desktop (nếu muốn cài desktop apps)
- User phải có quyền `sudo`
- zsh / oh-my-zsh nên được cài trước
