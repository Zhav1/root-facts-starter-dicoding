import { pipeline, env } from 'https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.2';
import { logError } from '../core/utils.js';

// Configure environment for CDN model loading
env.allowLocalModels = false;

class FunFactService {
	constructor() {
		this.generator = null;
		this.isModelLoaded = false;
		this.isGenerating = false;
		this.config = null;
		this.currentBackend = null;
	}

	async loadModel() {
		try {
			this.generator = await pipeline('text2text-generation', 'Xenova/LaMini-Flan-T5-78M');
			this.isModelLoaded = true;
		} catch (error) {
			logError('Error loading Transformers.js model', error);
			throw new Error(`Failed to load FunFact model: ${error.message}`);
		}
	}

	async generateFunFact(vegetable, tone = 'normal') {
		if (!this.isModelLoaded || this.isGenerating) {
			throw new Error('Model belum siap atau sedang menghasilkan fakta');
		}

		if (!vegetable || typeof vegetable !== 'string') {
			throw new Error('Nama sayuran yang valid diperlukan');
		}

		// Sanitize to prevent prompt injection and limit input length
		const sanitizedVegetable = vegetable.trim().replace(/[^a-zA-Z0-9\s-]/g, '').substring(0, 50);

		try {
			this.isGenerating = true;

			let prompt = '';
			if (tone === 'funny') {
				prompt = `Write a short, funny, and hilarious fun fact about the vegetable: ${sanitizedVegetable}. Keep it under 2 sentences.`;
			} else if (tone === 'professional') {
				prompt = `Write a short, educational, and professional scientific fact about the vegetable: ${sanitizedVegetable}. Keep it under 2 sentences.`;
			} else if (tone === 'casual') {
				prompt = `Write a friendly and casual short fact about the vegetable: ${sanitizedVegetable}. Keep it under 2 sentences.`;
			} else {
				prompt = `Write a short interesting fun fact about the vegetable: ${sanitizedVegetable}. Keep it under 2 sentences.`;
			}

			const result = await this.generator(prompt, {
				max_new_tokens: 60,
				temperature: 0.7,
				do_sample: true,
				top_p: 0.9
			});

			const generatedText = result[0]?.generated_text || `Fakta menarik tentang ${sanitizedVegetable} tidak dapat dihasilkan.`;
			return {
				funFact: generatedText.trim()
			};
		} catch (error) {
			logError('Error generating fun fact', error);
			throw new Error(`Failed to generate fun fact: ${error.message}`);
		} finally {
			this.isGenerating = false;
		}
	}

	isReady() {
		return this.isModelLoaded && !this.isGenerating;
	}
}

export default FunFactService;
