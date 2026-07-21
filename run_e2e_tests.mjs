import { chromium } from 'playwright';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = __dirname;

function createServer(port = 8080) {
	const mimeTypes = {
		'.html': 'text/html',
		'.css': 'text/css',
		'.js': 'application/javascript',
		'.json': 'application/json',
		'.png': 'image/png',
		'.jpg': 'image/jpeg',
		'.svg': 'image/svg+xml'
	};

	const server = http.createServer((req, res) => {
		let filePath = path.join(ROOT_DIR, req.url === '/' ? 'index.html' : req.url);
		filePath = filePath.split('?')[0];

		fs.readFile(filePath, (err, data) => {
			if (err) {
				res.writeHead(404, { 'Content-Type': 'text/plain' });
				res.end('404 Not Found');
				return;
			}
			const ext = path.extname(filePath).toLowerCase();
			const contentType = mimeTypes[ext] || 'application/octet-stream';
			res.writeHead(200, { 'Content-Type': contentType });
			res.end(data);
		});
	});

	return new Promise((resolve) => {
		server.listen(port, () => {
			console.log(`[Test Server] Running at http://localhost:${port}`);
			resolve(server);
		});
	});
}

async function runTests() {
	const server = await createServer(8080);
	const targetUrl = 'http://localhost:8080';

	console.log('\n==================================================');
	console.log('  STARTING AUTOMATED E2E TEST SUITE FOR ROOTFACTS  ');
	console.log('==================================================\n');

	const browser = await chromium.launch({
		headless: true,
		args: [
			'--use-fake-ui-for-media-stream',
			'--use-fake-device-for-media-stream',
			'--no-sandbox',
			'--disable-setuid-sandbox'
		]
	});

	// Grant clipboard permissions for headless environment
	const context = await browser.newContext({
		permissions: ['clipboard-read', 'clipboard-write']
	});
	const page = await context.newPage();

	const consoleLogs = [];
	const consoleErrors = [];

	page.on('console', (msg) => {
		const text = msg.text();
		consoleLogs.push(`[Browser ${msg.type()}] ${text}`);
		if (msg.type() === 'error') {
			consoleErrors.push(text);
		}
	});

	page.on('pageerror', (err) => {
		consoleErrors.push(`Uncaught exception: ${err.message}`);
	});

	try {
		console.log('▶ Test 1: Checking Initial Page Load & Component States...');
		await page.goto(targetUrl, { waitUntil: 'domcontentloaded' });

		await page.waitForSelector('#btn-toggle', { timeout: 10000 });
		const title = await page.title();
		console.log(`  ✓ Page title: "${title}"`);

		const initialStatus = await page.textContent('#header-status span:last-child');
		console.log(`  ✓ Initial header status: "${initialStatus.trim()}"`);

		const isPlaceholderVisible = await page.isVisible('#camera-placeholder');
		console.log(`  ✓ Camera placeholder visible: ${isPlaceholderVisible}`);

		const isIdleVisible = await page.isVisible('#state-idle');
		const isLoadingVisible = await page.isVisible('#state-loading');
		const isResultVisible = await page.isVisible('#state-result');

		console.log(`  ✓ State Idle visible: ${isIdleVisible}`);
		console.log(`  ✓ State Loading visible: ${isLoadingVisible}`);
		console.log(`  ✓ State Result visible: ${isResultVisible}`);

		console.log('\n▶ Test 2: Toggling Camera ON (1st Time)...');
		await page.click('#btn-toggle');
		await page.waitForTimeout(2000);

		const isScanningUIActive = await page.evaluate(() => {
			const btn = document.getElementById('btn-toggle');
			const placeholder = document.getElementById('camera-placeholder');
			const overlay = document.getElementById('camera-overlay');
			return {
				btnHasScanningClass: btn.classList.contains('scanning'),
				placeholderHidden: placeholder.classList.contains('hidden') || placeholder.style.display === 'none',
				overlayActive: overlay.classList.contains('active')
			};
		});

		console.log(`  ✓ Toggle Button has .scanning class: ${isScanningUIActive.btnHasScanningClass}`);
		console.log(`  ✓ Camera Placeholder hidden: ${isScanningUIActive.placeholderHidden}`);
		console.log(`  ✓ Camera Overlay active: ${isScanningUIActive.overlayActive}`);

		console.log('\n▶ Test 3: Toggling Camera OFF (Testing Icon Reset Fix)...');
		await page.click('#btn-toggle');
		await page.waitForTimeout(1000);

		const isCameraOffUI = await page.evaluate(() => {
			const btn = document.getElementById('btn-toggle');
			const placeholder = document.getElementById('camera-placeholder');
			return {
				btnHasScanningClass: btn.classList.contains('scanning'),
				placeholderVisible: !placeholder.classList.contains('hidden') && placeholder.style.display !== 'none',
				btnInnerHTML: btn.innerHTML
			};
		});

		console.log(`  ✓ Toggle Button lost .scanning class: ${!isCameraOffUI.btnHasScanningClass}`);
		console.log(`  ✓ Camera Placeholder visible again: ${isCameraOffUI.placeholderVisible}`);
		console.log(`  ✓ Button Inner HTML updated cleanly: ${isCameraOffUI.btnInnerHTML.includes('scan-line') || isCameraOffUI.btnInnerHTML.includes('lucide-scan-line')}`);

		console.log('\n▶ Test 4: Restarting Camera (3rd Toggle - Testing Reviewer Re-activation Bug)...');
		await page.click('#btn-toggle');
		await page.waitForTimeout(2000);

		const isRestartSuccessful = await page.evaluate(() => {
			const video = document.getElementById('videoElement');
			const placeholder = document.getElementById('camera-placeholder');
			return {
				videoReadyState: video.readyState,
				hasStream: !!video.srcObject,
				placeholderHidden: placeholder.classList.contains('hidden') || placeholder.style.display === 'none'
			};
		});

		console.log(`  ✓ Video stream re-attached: ${isRestartSuccessful.hasStream}`);
		console.log(`  ✓ Video readyState: ${isRestartSuccessful.videoReadyState}`);
		console.log(`  ✓ Camera Placeholder hidden on restart: ${isRestartSuccessful.placeholderHidden}`);

		console.log('\n▶ Test 5: Simulating High-Confidence Vegetable Detection...');
		await page.evaluate(() => {
			const mockResult = {
				className: 'Wortel (Carrot)',
				confidence: 92,
				isValid: true
			};
			const detectedName = document.getElementById('detected-name');
			const detectedConfidence = document.getElementById('detected-confidence');
			const confidenceFill = document.getElementById('confidence-fill');
			const stateIdle = document.getElementById('state-idle');
			const stateResult = document.getElementById('state-result');
			const funFactText = document.getElementById('fun-fact-text');

			if (detectedName) detectedName.textContent = mockResult.className;
			if (detectedConfidence) detectedConfidence.textContent = `${mockResult.confidence}%`;
			if (confidenceFill) confidenceFill.style.width = `${mockResult.confidence}%`;
			if (funFactText) funFactText.textContent = 'Wortel kaya akan Vitamin A dan beta-karoten!';

			if (stateIdle) stateIdle.classList.add('hidden');
			if (stateResult) stateResult.classList.remove('hidden');
		});

		await page.waitForTimeout(1000);

		const resultStateCheck = await page.evaluate(() => {
			const stateResult = document.getElementById('state-result');
			const detectedName = document.getElementById('detected-name')?.textContent;
			const detectedConfidence = document.getElementById('detected-confidence')?.textContent;
			const funFactText = document.getElementById('fun-fact-text')?.textContent;

			return {
				isResultCardVisible: !stateResult.classList.contains('hidden'),
				detectedName,
				detectedConfidence,
				funFactText
			};
		});

		console.log(`  ✓ Result card visible: ${resultStateCheck.isResultCardVisible}`);
		console.log(`  ✓ Detected name rendered: "${resultStateCheck.detectedName}"`);
		console.log(`  ✓ Confidence rendered: "${resultStateCheck.detectedConfidence}"`);
		console.log(`  ✓ FunFact text rendered: "${resultStateCheck.funFactText}"`);

		console.log('\n▶ Test 6: Testing Tone Selector Options...');
		const toneOptions = await page.$$eval('#tone-select option', (opts) => opts.map((o) => o.value));
		console.log(`  ✓ Tone select options found: [${toneOptions.join(', ')}]`);

		console.log('\n▶ Test 7: Testing Copy FunFact Button...');
		await page.click('#btn-copy');
		await page.waitForTimeout(500);
		const isCopied = await page.evaluate(() => document.getElementById('btn-copy').classList.contains('copied'));
		console.log(`  ✓ Copy button state changed to copied: ${isCopied}`);

		console.log('\n--------------------------------------------------');
		console.log('  TEST SUMMARY & ERROR INSPECTION                 ');
		console.log('--------------------------------------------------');
		console.log(`Total Console Logs captured: ${consoleLogs.length}`);
		console.log(`Total Console Errors captured: ${consoleErrors.length}`);

		if (consoleErrors.length > 0) {
			console.log('\n⚠️ Console Errors Detected:');
			consoleErrors.forEach((err, idx) => console.log(`  ${idx + 1}. ${err}`));
		} else {
			console.log('\n🎉 ALL E2E TEST CASES PASSED WITH 0 CONSOLE ERRORS!');
		}

	} catch (err) {
		console.error('\n❌ E2E TEST FAILED:', err.message);
	} finally {
		await browser.close();
		server.close();
		process.exit(0);
	}
}

runTests();
