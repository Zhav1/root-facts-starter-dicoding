import { logError, validateModelMetadata } from '../core/utils.js';

class DetectionService {
	constructor() {
		this.model = null;
		this.labels = [];
		this.config = null;
	}

	async loadModel() {
		try {
			await tf.ready();
			if (navigator.gpu) {
				try {
					await tf.setBackend('webgpu');
					console.log('Using WebGPU backend');
				} catch (e) {
					await tf.setBackend('webgl');
					console.log('Fallback to WebGL backend');
				}
			} else {
				await tf.setBackend('webgl');
				console.log('Using WebGL backend');
			}
			
			this.model = await tf.loadLayersModel('./model/model.json');
			const response = await fetch('./model/metadata.json');
			const metadata = await response.json();
			if (!validateModelMetadata(metadata)) {
				throw new Error('Model metadata is invalid');
			}
			this.labels = metadata.labels;
		} catch (error) {
			logError('Failed to load model', error);
			throw new Error(`Failed to load model: ${error.message}`);
		}
	}

	async predict(imageElement) {
		try {
			if (!this.model) {
				throw new Error('Model belum dimuat');
			}

			let probabilities;
			const tensor = tf.tidy(() => {
				let t = tf.browser.fromPixels(imageElement);
				t = tf.image.resizeBilinear(t, [224, 224]);
				t = t.toFloat().div(127.5).sub(1.0);
				return t.expandDims(0);
			});
			
			const prediction = this.model.predict(tensor);
			probabilities = await prediction.data();
			
			tf.dispose([tensor, prediction]);

			if (!probabilities || probabilities.length === 0) {
				throw new Error('Hasil prediksi kosong');
			}

			let maxProb = -1;
			let maxIndex = -1;
			for (let i = 0; i < probabilities.length; i++) {
				if (probabilities[i] > maxProb) {
					maxProb = probabilities[i];
					maxIndex = i;
				}
			}

			const confidence = Math.round(maxProb * 100);
			return {
				className: this.labels[maxIndex] || 'Unknown',
				confidence: confidence,
				isValid: true
			};
		} catch (error) {
			logError('Prediction error', error);
			throw new Error(`Prediksi gagal: ${error.message}`);
		}
	}

	isLoaded() {
		return !!this.model;
	}
}

export default DetectionService;
