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
│   ├── first-run-choices.sh       # Gum prompts: optional apps (Spotify/Zoom/Dropbox), languages, databases
│   ├── identification.sh          # Git user config
│   ├── check-version.sh           # Kiểm tra Debian version + kiến trúc x86
│   ├── terminal.sh                # Chạy tất cả installer trong install/terminal/*.sh
│   ├── desktop.sh                 # Chạy tất cả installer trong install/desktop/*.sh
│   ├── terminal/                  # Tools CLI (chạy theo thứ tự alphabet)
│   │   ├── required/app-gum.sh    # Gum (TUI prompts) – cài trước tiên
│   │   ├── a-shell.sh             # Cấu hình shell, set OMADEBIAN_PATH – phải chạy trước
│   │   ├── docker.sh, fonts.sh, libraries.sh, mise.sh...
│   │   └── select-dev-language.sh / select-dev-storage.sh
│   └── desktop/                   # Apps GNOME (chạy theo thứ tự alphabet)
│       ├── a-flatpak.sh           # Setup Flatpak + Flathub – phải chạy trước app-* dùng flatpak
│       ├── a-snap.sh              # Setup Snap (hiện không có app snap nào dùng)
│       ├── app-alacritty.sh       # Terminal mặc định
│       ├── app-brave.sh           # Brave browser (bắt buộc)
│       ├── app-ghostty.sh         # Ghostty terminal qua APT ghostty-debian (bắt buộc)
│       ├── app-vscode.sh          # VSCode qua APT Microsoft
│       ├── app-chrome.sh          # Chrome
│       ├── app-zed.sh             # Zed editor
│       ├── app-gimp.sh / app-obs-studio.sh / ...
│       └── select-optional-apps.sh  # Đọc $OMADEBIAN_FIRST_RUN_OPTIONAL_APPS → source từng app
│           optional/              # Apps tuỳ chọn (Spotify, Zoom, Dropbox, Obsidian...)
├── configs/                       # Config files được copy vào ~/.config/ khi install
│   ├── ghostty/config             # Ghostty: theme GitHub Dark, font CaskaydiaMono 11, block cursor
│   ├── alacritty/                 # Alacritty multi-file config
│   ├── neovim/                    # Neovim config
│   └── zshrc, bashrc, starship.toml, zellij.kdl, btop.conf...
├── themes/                        # Colour themes (mặc định: GitHub Dark Default)
├── defaults/                      # Shell dotfiles mặc định (bash/, zsh/) – set OMADEBIAN_PATH
├── applications/                  # GNOME .desktop shortcuts
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
- Sẽ tự động được chạy vì `desktop.sh` và `terminal.sh` glob `*.sh` theo **thứ tự alphabet**
- Dùng prefix `a-` nếu cần chạy trước các script khác (ví dụ `a-flatpak.sh`)

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

Script: `install/desktop/app-ghostty.sh` (bắt buộc)
Config: `configs/ghostty/config`

Cài qua APT repo không chính thức của [dariogriffo/ghostty-debian](https://github.com/dariogriffo/ghostty-debian):
- GPG key: `https://debian.griffo.io/EA0F721D231FDD3A0A17B9AC7808B4DD62C41256.asc`
- APT source: `https://debian.griffo.io/apt`
- Hỗ trợ: Debian Bookworm, Trixie, Sid

Config: theme GitHub Dark Default, font CaskaydiaMono 11, background-opacity 0.95, block cursor, Alt+Arrow điều hướng pane.

## Biến môi trường quan trọng

| Biến | Mô tả |
|------|--------|
| `OMADEBIAN_PATH` | Path tới `~/.local/share/omadebian` – set bởi `a-shell.sh` lúc install |
| `OMADEBIAN_FIRST_RUN_OPTIONAL_APPS` | Danh sách optional apps được chọn (Spotify/Zoom/Dropbox) |
| `OMADEBIAN_FIRST_RUN_LANGUAGES` | Ngôn ngữ lập trình được chọn |
| `OMADEBIAN_FIRST_RUN_DBS` | Databases được chọn |

## Yêu cầu hệ thống

- Debian 13+ (Trixie) hoặc Sid, kiến trúc x86_64
- GNOME desktop (nếu muốn cài desktop apps)
- User phải có quyền `sudo` và **không phải root**
- Kết nối internet ổn định
- zsh / oh-my-zsh nên được cài trước

## Vấn đề đã biết

- `check-version.sh` dùng `exit 1` thay vì `return 1` — khi được `source`, lệnh này sẽ kill cả terminal session thay vì chỉ dừng install
- Không có cơ chế sudo keep-alive — nếu install kéo dài >15 phút, sudo timeout sẽ khiến script bị treo chờ mật khẩu
- `a-snap.sh` vẫn chạy dù hiện không có app snap nào
- `lsb_release` có thể chưa được cài trên Debian minimal (cần cho ghostty APT source)
