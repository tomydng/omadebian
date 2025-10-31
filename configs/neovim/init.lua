-- bootstrap lazy.nvim, LazyVim and your plugins
require("config.lazy")

local restore_cursor_augroup = vim.api.nvim_create_augroup("restore_cursor_shape_on_exit", { clear = true })

-- command = "set guicursor=a:hor20"
-- command = "set guicursor=a:block"
-- :h guicursor for more details
vim.api.nvim_create_autocmd({ "VimLeave" }, {
  group = restore_cursor_augroup,
  desc = "restore the cursor shape on exit of neovim",
  command = "set guicursor=a:ver20",
})
