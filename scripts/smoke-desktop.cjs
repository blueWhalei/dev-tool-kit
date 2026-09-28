// Run after pnpm build: node scripts/smoke-desktop.cjs
// Uses a hidden real Electron window and an isolated temporary profile/fixtures.
const fs = require('fs')
const path = require('path')
const os = require('os')
const assert = require('assert/strict')
const repo = path.resolve(__dirname, '..')

if (!process.versions.electron) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'dev-toolkit-smoke-'))
  const env = { ...process.env, DEV_TOOLKIT_SMOKE_ROOT: root }
  delete env.ELECTRON_RUN_AS_NODE
  delete env.ELECTRON_RENDERER_URL
  const child = require('child_process').spawn(require('electron'), [__filename], {
    cwd: repo,
    env,
    windowsHide: true,
    stdio: 'inherit'
  })
  child.on('error', error => {
    console.error(error)
    process.exitCode = 1
  })
  child.on('exit', code => {
    // root is the exact directory created above; never remove a caller-supplied path.
    const resolved = path.resolve(root)
    const temp = path.resolve(os.tmpdir()) + path.sep
    if (resolved.startsWith(temp) && path.basename(resolved).startsWith('dev-toolkit-smoke-')) {
      fs.rmSync(resolved, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 })
    }
    process.exitCode = code || 0
  })
} else {
  const { app, BrowserWindow, dialog, ipcMain } = require('electron')
  const root = process.env.DEV_TOOLKIT_SMOKE_ROOT
  fs.mkdirSync(path.join(root, 'profile'))
  app.setPath('userData', path.join(root, 'profile'))
  app.disableHardwareAcceleration()
  BrowserWindow.prototype.show = function () {}
  let selection = []
  dialog.showOpenDialog = async () => ({ canceled: false, filePaths: selection })
  const handle = ipcMain.handle.bind(ipcMain)
  const deadline = setTimeout(() => {
    console.error('Desktop smoke timed out')
    app.exit(1)
  }, 45000)
  app.once('browser-window-created', (_, win) => {
    win.webContents.once('did-finish-load', () =>
      smoke(win)
        .then(() => {
          clearTimeout(deadline)
          console.log(
            'DESKTOP_SMOKE_PASS: built workers, rename/undo safety, numeric inputs, image overlay/compression, batch progress/cancel/retry/save, IPC failure handling, locale reactivity'
          )
          app.exit(0)
        })
        .catch(error => {
          console.error(error)
          app.exit(1)
        })
    )
  })
  require(path.join(repo, 'apps/desktop/out/main/index.js'))

  async function smoke(win) {
    const errors = []
    const run = (fn, ...args) =>
      win.webContents.executeJavaScript(`(${fn.toString()})(...${JSON.stringify(args)})`)
    const waitFor = async (fn, ...args) => {
      for (let i = 0; i < 150; i++) {
        if (await run(fn, ...args)) return
        await new Promise(resolve => setTimeout(resolve, 30))
      }
      throw new Error(
        'UI condition timed out: ' +
          fn.toString() +
          '\n' +
          (await run(() => document.body.innerText.slice(-3000)))
      )
    }
    const route = async (url, text) => {
      await run(url => {
        location.hash = url
      }, url)
      await waitFor(text => document.body.innerText.includes(text), text)
    }
    const click = async text => {
      await waitFor(
        text =>
          [...document.querySelectorAll('button, [role="radio"], .n-radio-button')].some(
            el =>
              el.textContent.trim() === text &&
              !el.disabled &&
              !el.classList.contains('n-button--loading')
          ),
        text
      )
      assert(
        await run(text => {
          const el = [...document.querySelectorAll('button, [role="radio"], .n-radio-button')].find(
            el => el.textContent.trim() === text
          )
          if (!el || el.disabled) return false
          el.click()
          return true
        }, text),
        'Missing or disabled control: ' + text
      )
    }
    const invoke = (channel, ...args) =>
      run((channel, args) => window.electronAPI.invoke(channel, ...args), channel, args)
    await run(() => {
      window.__smokeErrors = []
      window.addEventListener('error', event => window.__smokeErrors.push(event.message))
      window.addEventListener('unhandledrejection', event =>
        window.__smokeErrors.push(String(event.reason))
      )
      localStorage.setItem('dev-toolkit-locale', 'en-US')
      window.dispatchEvent(
        new StorageEvent('storage', {
          storageArea: localStorage,
          key: 'dev-toolkit-locale',
          newValue: 'en-US'
        })
      )
    })
    // VueUse reacts to storage events without reloading or changing real user preferences.
    await route('/file-renamer', 'Select files')
    const a = path.join(root, 'a.txt'),
      b = path.join(root, 'b.txt')
    fs.writeFileSync(a, 'a')
    fs.writeFileSync(b, 'b')
    selection = [a, b]
    await click('Select files')
    await waitFor(() => document.querySelectorAll('.preview-table-row').length === 2)
    assert.equal(await run(() => document.querySelectorAll('.n-input-number').length), 2)
    await run(() => {
      const input = document.querySelector('.n-input-number input')
      input.value = ''
      input.dispatchEvent(new Event('input', { bubbles: true }))
      input.dispatchEvent(new Event('change', { bubbles: true }))
      input.blur()
    })
    await waitFor(() =>
      [...document.querySelectorAll('button')].some(
        el => el.textContent.trim() === 'Execute rename' && !el.disabled
      )
    )
    const pending = await invoke(
      'file-renamer:preview',
      [
        { name: 'a.txt', path: a },
        { name: 'b.txt', path: b }
      ],
      [{ type: 'prefix', value: 'x_' }]
    )
    const target = path.join(root, 'x_a.txt')
    fs.writeFileSync(target, 'protected')
    const result = await invoke('file-renamer:execute', pending)
    assert.equal(result[0].error, 'targetExists')
    assert.equal(result[1].success, true)
    assert.equal(fs.readFileSync(target, 'utf8'), 'protected')
    const undo = await invoke('file-renamer:undo', [
      { oldPath: b, newPath: path.join(root, 'x_b.txt') }
    ])
    assert.equal(undo[0].success, true)
    // Run the ordinary UI rename and exercise partial undo + retry.
    selection = [a, b]
    await click('Select files')
    await waitFor(
      () =>
        document.querySelectorAll('.preview-table-row').length === 2 &&
        [...document.querySelectorAll('button')].some(
          el => el.textContent.trim() === 'Execute rename' && !el.disabled
        )
    )
    await click('Execute rename')
    await waitFor(() => document.body.innerText.includes('Success: 2'))
    await run(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    })
    // Files mode retains the renamed selection so undo remains accessible.
    await waitFor(() => document.querySelectorAll('.preview-table-row').length === 2)
    fs.writeFileSync(a, 'new occupant')
    await click('Undo last rename')
    await waitFor(() => document.body.innerText.includes('Failed: 1'))
    assert.equal(fs.readFileSync(a, 'utf8'), 'new occupant')
    fs.unlinkSync(a)
    await run(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    })
    await click('Undo last rename')
    await waitFor(
      () =>
        document.body.innerText.includes('Success: 1') &&
        !document.querySelector('.result-stats .fail')
    )
    assert.equal(fs.readFileSync(a, 'utf8'), 'a')

    const sharp = require(path.join(repo, 'apps/desktop/node_modules/sharp'))
    const imageA = path.join(root, 'a.jpg'),
      imageB = path.join(root, 'b.png')
    await sharp({ create: { width: 3, height: 2, channels: 3, background: 'red' } })
      .withMetadata({ orientation: 6 })
      .withExifMerge({ IFD0: { Artist: 'private marker' } })
      .jpeg()
      .toFile(imageA)
    await sharp({ create: { width: 2, height: 4, channels: 3, background: 'blue' } })
      .png()
      .toFile(imageB)
    await route('/image-tools?tab=compare', 'Image A')
    selection = [imageA]
    await click('Image A')
    await waitFor(() => document.body.innerText.includes('Image loaded'))
    selection = [imageB]
    await click('Image B')
    await waitFor(() => !!document.querySelector('.compare-slider-container'))
    await click('Difference overlay')
    await waitFor(() => !!document.querySelector('.compare-diff-overlay img')?.naturalWidth)
    const dimensions = await run(() => {
      const img = document.querySelector('.compare-diff-overlay img')
      return [img.naturalWidth, img.naturalHeight]
    })
    assert.deepEqual(dimensions, [2, 4])
    const compressed = await invoke('image-tools:compress', imageA, { format: 'jpeg', quality: 80 })
    for (const image of [compressed]) {
      assert(image)
      const meta = await sharp(Buffer.from(image.data, 'base64')).metadata()
      assert.equal(meta.exif, undefined)
      assert.equal(meta.orientation, undefined)
      assert.equal(meta.width, 2)
      assert.equal(meta.height, 3)
    }
    selection = [imageA, imageB]
    const picked = await invoke('image-tools:pickImages')
    assert.equal(picked.length, 2)
    assert(picked.every(item => !('base64' in item) && !('dataUri' in item)))
    await run(() => {
      window.__batchEvents = []
      window.__batchOff = window.electronAPI.on('image-tools:batchProgress', event =>
        window.__batchEvents.push(event)
      )
    })
    assert.equal(
      (await invoke('image-tools:batchStart', { taskId: '../bad', items: [], config: {} })).success,
      false
    )
    const task = {
      taskId: 'smoke-batch',
      items: [...picked, { fileName: 'denied.png', filePath: path.join(root, 'denied.png') }],
      config: { operation: 'compress', compressOptions: { format: 'jpeg', quality: 80 } }
    }
    assert.equal((await invoke('image-tools:batchStart', task)).success, true)
    await waitFor(() => window.__batchEvents.some(event => event.finished))
    const events = await run(() => window.__batchEvents)
    assert(events.some(event => event.item.status === 'processing'))
    assert.equal(events.filter(event => event.item.status === 'done').length, 2)
    assert(events.some(event => event.item.error === 'unauthorized_path'))
    assert(events.every(event => !event.item.result || !('data' in event.item.result)))
    const outputDir = path.join(root, 'batch-output')
    fs.mkdirSync(outputDir)
    selection = [outputDir]
    const saved = await invoke('image-tools:batchSave', task.taskId)
    assert.equal(saved.saved, 2)
    const oriented = await sharp(
      path.join(outputDir, path.parse(picked[0].fileName).name + '.jpeg')
    ).metadata()
    assert.deepEqual([oriented.width, oriented.height, oriented.exif], [2, 3, undefined])
    const savedAgain = await invoke('image-tools:batchSave', task.taskId)
    assert.equal(savedAgain.saved, 0)
    assert.equal(savedAgain.failed, 2)
    await run(() => {
      window.__batchEvents = []
    })
    assert.equal((await invoke('image-tools:batchRetry', task.taskId)).success, true)
    await waitFor(() => window.__batchEvents.some(event => event.finished))
    assert.equal(
      (await run(() => window.__batchEvents)).some(event => event.item.status === 'done'),
      false
    )
    assert.equal((await invoke('image-tools:batchRelease', task.taskId)).success, true)
    await run(() => {
      window.__batchEvents = []
    })
    const cancelTask = {
      ...task,
      taskId: 'smoke-cancel',
      items: Array.from({ length: 100 }, () => picked[0])
    }
    await invoke('image-tools:batchStart', cancelTask)
    await invoke('image-tools:batchCancel', cancelTask.taskId)
    await waitFor(() => window.__batchEvents.some(event => event.finished))
    assert((await run(() => window.__batchEvents)).some(event => event.item.status === 'cancelled'))
    await invoke('image-tools:batchRelease', cancelTask.taskId)
    await run(() => window.__batchOff())
    const retryImage = path.join(root, 'retry.png')
    fs.writeFileSync(retryImage, 'not an image')
    selection = [imageA, retryImage]
    await route('/image-tools?tab=batch', 'Select images')
    await click('Select images')
    await click('Start')
    await waitFor(() =>
      [...document.querySelectorAll('button')].some(
        button => button.textContent.trim() === 'Retry unfinished'
      )
    )
    fs.copyFileSync(imageB, retryImage)
    await click('Retry unfinished')
    await waitFor(
      () =>
        ![...document.querySelectorAll('button')].some(
          button => button.textContent.trim() === 'Retry unfinished'
        )
    )
    const uiOutput = path.join(root, 'batch-ui-output')
    fs.mkdirSync(uiOutput)
    selection = [uiOutput]
    await click('Save all')
    await waitFor(() => document.body.innerText.includes('All files saved'))
    assert.equal(fs.readdirSync(uiOutput).length, 2)
    await route('/key-pair-generator', 'Generate key pair')
    ipcMain.removeHandler('key-pair-generator:generate')
    handle('key-pair-generator:generate', () => {
      throw new Error('smoke IPC failure')
    })
    await click('Generate key pair')
    await waitFor(() => document.body.innerText.includes('smoke IPC failure'))
    await route('/certificate-parser', 'Load Certificate File')
    ipcMain.removeHandler('cert-parser:parsePem')
    handle('cert-parser:parsePem', () => {
      throw new Error('smoke certificate IPC failure')
    })
    await run(() => {
      const el = document.querySelector('textarea')
      el.value = 'invalid PEM'
      el.dispatchEvent(new Event('input', { bubbles: true }))
    })
    await waitFor(() => document.body.innerText.includes('smoke certificate IPC failure'))
    assert.deepEqual(await invoke('regex:replace', '(hello)', 'g', 'hello world', '$1!'), {
      success: true,
      result: 'hello! world'
    })
    const started = Date.now()
    const slowPreview = invoke(
      'file-renamer:preview',
      [{ name: 'a'.repeat(40) + '!.txt', path: a }],
      [{ type: 'regex', pattern: '(a+)+$' }]
    )
    await invoke('app:getVersion')
    assert(Date.now() - started < 2000, 'Main process was blocked by rename regex')
    assert.equal((await slowPreview)[0].conflict, 'workerTimeout')
    await route('/http-status-codes', '1xx Informational')
    await run(() => {
      localStorage.setItem('dev-toolkit-locale', 'zh-CN')
      window.dispatchEvent(
        new StorageEvent('storage', {
          storageArea: localStorage,
          key: 'dev-toolkit-locale',
          newValue: 'zh-CN'
        })
      )
    })
    await waitFor(() => document.body.innerText.includes('信息响应'))
    errors.push(...(await run(() => window.__smokeErrors)))
    assert.deepEqual(errors, [])
  }
}
