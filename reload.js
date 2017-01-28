module.exports = (port) => {
  const ws = new WebSocket(`ws://localhost:${port}`)

  ws.onopen = () => console.log('Live reload connected..')
  ws.onmessage = msg => (msg.data === 'reload') ? chrome.runtime.reload() : null
}
