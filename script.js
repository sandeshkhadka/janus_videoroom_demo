const server = "http://localhost:8088/janus"
let sessionId = null, pluginId = null;
let sessionEndpoint = null, pluginEndpoint = null;
let webRTCconnection = null

function makeid(length = 5) {
  let result = '';
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const charactersLength = characters.length;
  let counter = 0;
  while (counter < length) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
    counter += 1;
  }
  return result;
}


async function post(url, payload) {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  })
  return response.json()
}

async function createSession() {
  let payload = {
    janus: "create",
    transaction: makeid()
  }
  const response = await post(server, payload)
  if (response.janus == "success") {
    sessionId = response.data.id;
    sessionEndpoint = server + "/" + sessionId;
    console.log("Created session: ", sessionId)
    return sessionId;
  } else {
    alert("Failed to create a janus session")
  }
}

async function attachPlugin() {
  if (!sessionId) {
    alert("No session found")
    return;
  }
  let payload = {
    janus: "attach",
    plugin: "janus.plugin.videoroom",
    transaction: makeid()
  }
  const response = await post(sessionEndpoint, payload)
  if (response.janus == "success") {
    pluginId = response.data.id;
    pluginEndpoint = sessionEndpoint + "/" + pluginId
    console.log("Attached to plugin: ", pluginId)
    return pluginId;
  } else {
    alert("Could not attach to plugin")
  }
}

async function joinRoom() {
  if (!pluginId) {
    alert("Not attached to plugin")
    return;
  }
  let payload = {
    janus: "message",
    transaction: makeid(),
    body: {
      request: "join",
      ptype: "publisher",
      room: 1234
    }
  }
  const response = await post(pluginEndpoint, payload)
  if (response.videoroom = "joined") {
    console.log("Joined room: ", response)
  }
}
async function publish() {
  webRTCconnection = new RTCPeerConnection()
  webRTCconnection.onicecandidate = e => {
    console.log(webRTCconnection.localDescription)
  }
  webRTCconnection.ontrack = e => {
    console.log("Got track: ", e)
  }
  mediaStream = await navigator.mediaDevices.getUserMedia({
    video: true,
    // audio: true,
  })
  mediaStream.getTracks().forEach(track => {
    webRTCconnection.addTrack(track, mediaStream)
    console.log("Added Track: ", track)
  })

  let offer = await webRTCconnection.createOffer()
  webRTCconnection.setLocalDescription(offer)

  let payload = {
    janus: "message",
    transaction: makeid(),
    body: {
      request: "publish",
    },
    jsep: offer
  }
  return await post(pluginEndpoint,payload)
}

async function startRecording(){
  let payload = {
    janus: "message",
    transaction: makeid(),
    body: {
      request: "enable_recording",
      room: 1234,
      record: true,
      // timestamp: Date.now()
    }
  }
  return post(pluginEndpoint,payload)
}

async function stopRecording(){
  let payload = {
    janus: "message",
    transaction: makeid(),
    body: {
      request: "enable_recording",
      room: 1234,
      record: false,
      // timestamp: Date.now()
    }
  }
  return post(pluginEndpoint,payload)
}

async function main() {
  createSession().then(() => {
    poller()
  })
}

async function poller() {
  try {
    const response = await fetch(sessionEndpoint)
    const responseObj = await response.json()
    console.log("Message: ", responseObj)
    handleMessage(responseObj)
    poller()
  } catch (error) {
    console.error('Error polling Janus events:', error);
    setTimeout(poller, 2000)
  }
}
async function handleMessage(messageObj){
  if(messageObj.jsep){
    console.log("Received answer")
    webRTCconnection.setRemoteDescription(messageObj.jsep)
  }
}
main()
