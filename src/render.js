const { desktopCapturer, remote } = require('electron');
const { Menu, dialog } = remote;
const { writeFile } = require('fs');

const videoElement = document.querySelector('video');
const startButton = document.getElementById('startButton');
const stopButton = document.getElementById('stopButton');
const videoSelectButton = document.getElementById('videoSelectButton');

const getVideoSources = async () => {
  const inputSources = await desktopCapturer.getSources({
    types: ['window', 'screen'],
  });

  const videoOptionsMenu = Menu.buildFromTemplate(
    inputSources.map((source) => {
      return {
        label: source.name,
        click: () => selectSource(source),
      };
    }),
  );

  videoOptionsMenu.popup();
};

let mediaRecorder;
let recorderChunks = [];

const selectSource = async (source) => {
  videoSelectButton.innerText = source.name;

  const constraints = {
    audio: false,
    video: {
      mandatory: {
        chromeMediaSource: 'desktop',
        chromeMediaSourceId: source.id,
      }
    }
  };

  const stream = await navigator.mediaDevices.getUserMedia(constraints);

  videoElement.srcObject = stream;
  await videoElement.play();

  const options = {
    mimeType: 'video/webm; codecs=vp9',
  };
  mediaRecorder = new MediaRecorder(stream, options);

  mediaRecorder.ondataavailable = onRecordingDataAvailable;
  mediaRecorder.onstop = onRecordingStop;
};

const onRecordingDataAvailable = (event) => {
  recorderChunks.push(event.data);
};

const onRecordingStop = async () => {
  const blob = new Blob(recorderChunks, {
    type: 'video/webm; codecs=vp9',
  });

  const buffer = Buffer.from(await blob.arrayBuffer());

  const { filePath } = await dialog.showSaveDialog({
    buttonLabel: 'Save video',
    defaultPath: `electron-recording-${new Date(Date.now()).toISOString().slice(0, 10)}.webm`,
  });

  writeFile(filePath, buffer, () => alert('Video saved successfully'));
};

videoSelectButton.onclick = getVideoSources;
startButton.onclick = () => {
  if (!mediaRecorder) {
    alert('Choose a video source');
    return;
  }
  if (mediaRecorder.state !== 'inactive') {
    return;
  }
  mediaRecorder.start();
  startButton.classList.add('is-danger');
  startButton.innerText = 'Recording';
};
stopButton.onclick = () => {
  if (!mediaRecorder || mediaRecorder.state !== 'recording') {
    return;
  }
  mediaRecorder.stop();
  startButton.classList.remove('is-danger');
  startButton.innerText = 'Start';
  recorderChunks = [];
};
