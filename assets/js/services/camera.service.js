import {
	getCameraErrorMessage,
	logError
} from '../core/utils.js';

class CameraService {
	constructor() {
		this.stream = null;
		this.video = null;
		this.canvas = null;
		this.config = null;
		this.fps = 30;

		this.initializeElements();
		this.init();
	}

	initializeElements() {
		this.video = document.getElementById('videoElement');
		this.canvas = document.getElementById('canvasElement');
	}

	async init() {
		await this.loadCameras();
	}

	async loadCameras() {
		try {
			const devices = await navigator.mediaDevices.enumerateDevices();
			return devices.filter(device => device.kind === 'videoinput');
		} catch (error) {
			logError('Gagal memuat kamera', error);
			throw new Error(`Akses kamera gagal: ${error.message}`);
		}
	}

	async startCamera(facingMode = 'environment') {
		try {
			if (this.stream) {
				this.stopCamera();
			}
			const constraints = {
				video: {
					facingMode: facingMode === 'front' ? 'user' : 'environment',
					width: { ideal: 640 },
					height: { ideal: 480 }
				},
				audio: false
			};
			this.stream = await navigator.mediaDevices.getUserMedia(constraints);
			if (this.video) {
				this.video.srcObject = this.stream;
				await this.video.play();
			}
		} catch (error) {
			console.log('Camera restart error:', error);
			logError('Gagal memulai kamera', error);
			const errorMessage = getCameraErrorMessage(error);
			throw new Error(errorMessage);
		}
	}

	stopCamera() {
		if (this.stream) {
			this.stream.getTracks().forEach(track => track.stop());
			this.stream = null;
		}
		if (this.video) {
			this.video.srcObject = null;
		}
	}

	setFPS(fps) {
		this.fps = fps;
	}

	isActive() {
		return !!this.stream && this.stream.active;
	}

	isReady() {
		return !!this.video && this.video.readyState >= 2 && this.video.videoWidth > 0 && this.video.videoHeight > 0;
	}
}

export default CameraService;
