import UIHandler from '../ui/ui.handler.js';
import { APP_CONFIG } from './config.js';
import { logError, isValidDetection } from './utils.js';
import CameraService from '../services/camera.service.js';
import DetectionService from '../services/detection.service.js';
import FunFactService from '../services/facts.service.js';

class RootFactsApp {
	constructor() {
		this.detector = new DetectionService();
		this.camera = new CameraService();
		this.funFactGenerator = new FunFactService();
		this.ui = new UIHandler();
		this.isRunning = false;
		this.currentLoopId = null;
		this.config = APP_CONFIG;
		this.currentFunFact = '';
		this.currentTone = 'normal';

		this.ui.disableButton();
		this.bindEvents();
		this.init();
		this.registerServiceWorker();
	}

	bindEvents() {
		this.ui.bindEvents({
			onToggleCamera: () => this.toggleCamera(),
			onCameraChange: () => this.onCameraChange(),
			onFPSChange: (fps) => this.onFPSChange(fps),
			onCopy: () => this.onCopy(),
			onToneChange: (tone) => this.onToneChange(tone)
		});
	}

	async init() {
		try {
			this.ui.updateHeaderStatus('Memuat model...', true);
			await Promise.all([
				this.detector.loadModel(),
				this.funFactGenerator.loadModel()
			]);
			this.ui.updateHeaderStatus('Siap', false);
			this.ui.enableButton();
		} catch (error) {
			logError('Gagal menginisialisasi aplikasi', error);
			this.ui.updateHeaderStatus('Error', false);
			this.ui.showError(`Gagal menginisialisasi: ${error.message}`);
			this.ui.disableButton();
		}
	}

	registerServiceWorker() {
		if ('serviceWorker' in navigator) {
			window.addEventListener('load', () => {
				navigator.serviceWorker.register('./sw.js')
					.then(reg => console.log('Service Worker registered', reg))
					.catch(err => logError('Service Worker registration failed', err));
			});
		}
	}

	async onCopy() {
		try {
			const text = this.ui.getFunFactText();
			if (text) {
				await navigator.clipboard.writeText(text);
				this.ui.setCopyButtonCopied();
				setTimeout(() => this.ui.resetCopyButton(), 2000);
			}
		} catch (error) {
			logError('Gagal menyalin teks', error);
		}
	}

	onCameraChange() {
		if (this.camera.isActive()) {
			this.startCamera();
		}
	}

	onFPSChange(fps) {
		this.camera.setFPS(fps);
	}

	onToneChange(tone) {
		this.currentTone = tone;
	}

	async toggleCamera() {
		if (this.isRunning) {
			this.stopDetection();
			this.stopCamera();
		} else {
			try {
				await this.startCamera();
				this.startDetection();
			} catch (error) {
				this.ui.showError(error.message);
			}
		}
	}

	async startCamera() {
		const facingMode = this.ui.cameraSelect ? this.ui.cameraSelect.value : 'default';
		await this.camera.startCamera(facingMode);
		this.ui.updateCameraUI(true);
	}

	stopCamera() {
		this.camera.stopCamera();
		this.ui.updateCameraUI(false);
	}

	startDetection() {
		this.isRunning = true;
		this.ui.switchToState('loading');
		this.currentLoopId = requestAnimationFrame(() => this.detectLoop(this.currentLoopId));
	}

	stopDetection() {
		this.isRunning = false;
		if (this.currentLoopId) {
			cancelAnimationFrame(this.currentLoopId);
			this.currentLoopId = null;
		}
	}

	async detectLoop(loopId) {
		if (!this.isRunning || this.currentLoopId !== loopId) return;

		try {
			if (this.camera.isReady() && this.detector.isLoaded()) {
				const result = await this.detector.predict(this.camera.video);
				
				// Show real-time feedback while scanning
				this.ui.updateHeaderStatus(`Mendeteksi: ${result.className} (${result.confidence}%)`, true);

				if (isValidDetection(result)) {
					this.stopDetection();
					this.stopCamera();
					this.ui.showResults(result, null);
					await this.generateAndShowResults(result);
					return;
				}
			}
		} catch (error) {
			logError('Kesalahan dalam loop deteksi', error);
		}

		if (this.isRunning) {
			const delay = 1000 / (this.camera.fps || 10);
			setTimeout(() => {
				if (this.isRunning) {
					this.currentLoopId = requestAnimationFrame(() => this.detectLoop(loopId));
				}
			}, delay);
		}
	}

	async generateAndShowResults(detectionResult) {
		try {
			this.ui.updateFunFactState('loading');
			const factResult = await this.funFactGenerator.generateFunFact(detectionResult.className, this.currentTone);
			this.ui.updateFunFactState('success', factResult);
		} catch (error) {
			logError('Gagal menampilkan hasil', error);
			this.ui.updateFunFactState('error');
		}
	}
}

document.addEventListener('DOMContentLoaded', () => {
	const app = new RootFactsApp();
	if (typeof lucide !== 'undefined') {
		lucide.createIcons();
	}
});

export default RootFactsApp;
