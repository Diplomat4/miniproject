const stages = ['Manuscript', 'Prepress', 'Printing', 'Post-press Stage', 'Dispatch'];
const stageSubsteps = {
    'Manuscript': ['Editing', 'Proofreading', 'Approval'],
    'Prepress': ['Layout', 'Preflighting', 'Imposition', 'Platemaking'],
    'Printing': ['Make-ready', 'Trial Output', 'QC'],
    'Post-press Stage': ['Cutting/Trimming', 'Folding', 'Binding'],
    'Dispatch': ['Inspection', 'Packaging', 'Labelling', 'Distribution']
};

const $ = (id) => document.getElementById(id);

let jobs = [
    {
        id: 'JOB-2026-001',
        client: 'Oxford Press',
        title: 'Advanced Calculus',
        type: 'Academic',
        quantity: 2000,
        stage: 2,
        substep: 1,
        priority: 'Normal',
        createdAt: Date.now() - 1000 * 60 * 30
    },
    {
        id: 'JOB-2026-002',
        client: 'Penguin Random House',
        title: 'Le Comte de Monte Cristo',
        type: 'Trade',
        quantity: 15000,
        stage: 1,
        substep: 0,
        priority: 'Urgent',
        createdAt: Date.now() - 1000 * 60 * 10
    }
];

const JOBS_STORAGE_KEY = 'mk_print_jobs_v1';

function loadStoredJobs() {
    try {
        const raw = localStorage.getItem(JOBS_STORAGE_KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
    } catch (_err) {
        return [];
    }
}

function persistJobs() {
    try {
        localStorage.setItem(JOBS_STORAGE_KEY, JSON.stringify(jobs));
    } catch (_err) {
        // Ignore persistence errors; dashboard should still work in-memory.
    }
}

(() => {
    const stored = loadStoredJobs();
    if (!stored.length) return;
    const seen = new Set(jobs.map((j) => j.id));
    stored.forEach((job) => {
        if (!job || !job.id || seen.has(job.id)) return;
        jobs.push(job);
        seen.add(job.id);
    });
})();

const tableBody = document.querySelector('#jobsTable tbody');
const totalJobsEl = $('totalJobs');
const prepressEl = $('prepressCount');
const printEl = $('printCount');
const dispatchEl = $('dispatchCount');

const toastContainer = $('toastContainer');
const modalOverlay = $('appModal');
const modalTitleEl = $('modalTitle');
const modalBodyEl = $('modalBody');
const modalCloseBtn = $('modalCloseBtn');
const modalCancelBtn = $('modalCancelBtn');
const modalConfirmBtn = $('modalConfirmBtn');

function showToast(title, message, variant = 'success', timeoutMs = 2800) {
    if (!toastContainer) return;
    const el = document.createElement('div');
    el.className = `toast toast-${variant}`;
    el.innerHTML = `<div class="toast-title">${String(title)}</div><div class="toast-body">${String(message)}</div>`;
    toastContainer.appendChild(el);
    setTimeout(() => el.remove(), timeoutMs);
}

function confirmDialog({ title = 'Confirm', message = 'Are you sure?', confirmText = 'Confirm' } = {}) {
    return new Promise((resolve) => {
        if (!modalOverlay || !modalTitleEl || !modalBodyEl || !modalConfirmBtn || !modalCancelBtn || !modalCloseBtn) {
            resolve(window.confirm(message));
            return;
        }

        let done = false;
        function close(result) {
            if (done) return;
            done = true;
            modalOverlay.classList.remove('is-open');
            modalOverlay.setAttribute('aria-hidden', 'true');
            document.removeEventListener('keydown', onKeydown);
            modalOverlay.removeEventListener('click', onBackdrop);
            modalCloseBtn.removeEventListener('click', onCancel);
            modalCancelBtn.removeEventListener('click', onCancel);
            modalConfirmBtn.removeEventListener('click', onConfirm);
            resolve(result);
        }
        function onCancel() { close(false); }
        function onConfirm() { close(true); }
        function onBackdrop(e) { if (e.target === modalOverlay) close(false); }
        function onKeydown(e) { if (e.key === 'Escape') close(false); }

        modalTitleEl.textContent = title;
        modalBodyEl.textContent = message;
        modalConfirmBtn.textContent = confirmText;
        modalOverlay.classList.add('is-open');
        modalOverlay.setAttribute('aria-hidden', 'false');

        document.addEventListener('keydown', onKeydown);
        modalOverlay.addEventListener('click', onBackdrop);
        modalCloseBtn.addEventListener('click', onCancel);
        modalCancelBtn.addEventListener('click', onCancel);
        modalConfirmBtn.addEventListener('click', onConfirm);
        modalConfirmBtn.focus();
    });
}

function generateId() {
    return `JOB-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;
}

function getSubstepsForStage(stageIndex) {
    const stageName = stages[stageIndex] || stages[0];
    return stageSubsteps[stageName] || [];
}

function normalizeJobProgress(job) {
    if (!Number.isInteger(job.stage) || job.stage < 0) job.stage = 0;
    if (job.stage >= stages.length) job.stage = stages.length - 1;
    if (!Number.isInteger(job.substep) || job.substep < 0) job.substep = 0;
    const steps = getSubstepsForStage(job.stage);
    if (steps.length && job.substep >= steps.length) job.substep = steps.length - 1;
}

function getJobFilters() {
    return {
        search: ($('jobSearch')?.value || '').trim().toLowerCase(),
        type: $('jobTypeFilter')?.value || 'All',
        stageName: $('jobStageFilter')?.value || 'All',
        sort: $('jobSort')?.value || 'Newest'
    };
}

function renderSubstages(stageName, currentSubstep) {
    const list = stageSubsteps[stageName] || [];
    return list.map((s, idx) => {
        if (idx < currentSubstep) {
            return `<span class="badge" style="margin:0 4px 4px 0; background:#dcfce7; color:#166534;">${s}</span>`;
        }
        if (idx === currentSubstep) {
            return `<span class="badge" style="margin:0 4px 4px 0; background:#dbeafe; color:#1e40af;">${s}</span>`;
        }
        return `<span class="badge badge-default" style="margin:0 4px 4px 0;">${s}</span>`;
    }).join('');
}

function renderDashboard() {
    if (!tableBody || !totalJobsEl || !prepressEl || !printEl || !dispatchEl) return;

    totalJobsEl.textContent = jobs.length;
    prepressEl.textContent = jobs.filter((j) => j.stage === 1).length;
    printEl.textContent = jobs.filter((j) => j.stage === 2).length;
    dispatchEl.textContent = jobs.filter((j) => j.stage === stages.length - 1).length;
    tableBody.innerHTML = '';

    const { search, type, stageName, sort } = getJobFilters();
    const stageIdx = stageName === 'All' ? null : stages.indexOf(stageName);

    let visibleJobs = jobs.filter((j) => (type === 'All' ? true : j.type === type));
    if (stageIdx !== null && stageIdx >= 0) visibleJobs = visibleJobs.filter((j) => j.stage === stageIdx);
    if (search) {
        visibleJobs = visibleJobs.filter((j) => `${j.id} ${j.client} ${j.title}`.toLowerCase().includes(search));
    }
    visibleJobs.sort((a, b) => (sort === 'Oldest' ? (a.createdAt || 0) - (b.createdAt || 0) : (b.createdAt || 0) - (a.createdAt || 0)));

    if (!visibleJobs.length) {
        tableBody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:2rem; color:var(--text-sub);">No active jobs in the MIS. Add one to start.</td></tr>';
        return;
    }

    visibleJobs.forEach((job, loopIndex) => {
        normalizeJobProgress(job);
        const index = jobs.findIndex((j) => j.id === job.id);
        const tr = document.createElement('tr');
        
        tr.style.opacity = '0';
        tr.style.animation = `slideInLeft 0.4s ease-out ${loopIndex * 0.08}s forwards`;

        const badgeClass =
            job.type === 'Academic' ? 'badge-academic' :
            job.type === 'Trade' ? 'badge-trade' :
            job.type === 'Promotional' ? 'badge-promo' : 'badge-default';

        const priorityBadge = job.priority === 'Urgent'
            ? '<span class="badge" style="background:#fee2e2; color:#991b1b; margin-left:8px;">Urgent</span>'
            : '<span class="badge" style="background:#e2e8f0; color:#334155; margin-left:8px;">Normal</span>';

        let workflowHTML = '<div class="workflow-steps"><div class="workflow-bar"></div>';
        stages.forEach((step, sIndex) => {
            const statusClass = sIndex < job.stage ? 'completed' : sIndex === job.stage ? 'active' : '';
            const icon = sIndex < job.stage ? '\u2713' : sIndex + 1;
            workflowHTML += `<div class="step ${statusClass}"><div class="step-dot">${icon}</div><div class="step-label" style="display:${sIndex === job.stage ? 'block' : 'none'}">${step}</div></div>`;
        });
        workflowHTML += '</div>';

        const currentSubsteps = getSubstepsForStage(job.stage);
        const atFinalSubstep = job.stage === stages.length - 1 && job.substep >= Math.max(currentSubsteps.length - 1, 0);

        tr.innerHTML = `
            <td><strong>${job.id}</strong></td>
            <td>
                <div style="font-weight:600">${job.title}${priorityBadge}</div>
                <div style="font-size:0.8rem; color:var(--text-sub)">${job.client} \u2022 ${job.quantity} units</div>
            </td>
            <td><span class="badge ${badgeClass}">${job.type}</span></td>
            <td>
                <div style="font-weight:600; color:var(--primary); margin-bottom:0.35rem;">${stages[job.stage]}</div>
                <div style="display:flex; flex-wrap:wrap;">${renderSubstages(stages[job.stage], job.substep)}</div>
            </td>
            <td style="width:250px;">${workflowHTML}</td>
            <td>
                <button class="action-btn btn-advance" onclick="advanceStage(${index})">${atFinalSubstep ? 'Celebrate' : 'Next &rarr;'}</button>
                <button class="action-btn btn-delete" onclick="deleteJob(${index})">&times;</button>
            </td>
        `;
        tableBody.appendChild(tr);
    });
}

window.advanceStage = function(index) {
    const job = jobs[index];
    if (!job) return;
    normalizeJobProgress(job);

    const currentSubsteps = getSubstepsForStage(job.stage);
    const lastSubstep = Math.max(currentSubsteps.length - 1, 0);

    if (job.substep < lastSubstep) {
        job.substep++;
        persistJobs();
        renderDashboard();
        showToast('Sub-stage updated', `${job.id} \u2192 ${currentSubsteps[job.substep]}`, 'success');
        return;
    }

    if (job.stage < stages.length - 1) {
        job.stage++;
        job.substep = 0;
        const first = getSubstepsForStage(job.stage)[0];
        persistJobs();
        renderDashboard();
        showToast('Stage updated', `${job.id} \u2192 ${stages[job.stage]}${first ? ` (${first})` : ''}`, 'success');
        return;
    }

    showToast('Milestone reached', `Great work. ${job.id} completed Distribution and is ready for delivery.`, 'success');
};

window.deleteJob = function(index) {
    const job = jobs[index];
    if (!job) return;
    confirmDialog({
        title: 'Cancel job?',
        message: `This will remove ${job.id} from the dashboard.`,
        confirmText: 'Cancel job'
    }).then((ok) => {
        if (!ok) return;
        const removed = jobs.splice(index, 1)[0];
        persistJobs();
        renderDashboard();
        showToast('Job cancelled', removed ? removed.id : 'Job removed', 'warning');
    });
};

function initManuscriptWorkspace() {
    const roleEl = $('msRole');
    const stageEl = $('msStage');
    const fileEl = $('msFile');
    const dropzoneEl = $('msDropzone');
    const selectedFileEl = $('msSelectedFile');
    const noteEl = $('msNote');
    const saveBtn = $('msSaveBtn');
    const clearBtn = $('msClearBtn');
    const previewContainerEl = $('preview-container');
    const printSummaryEl = $('printOptionsSummary');
    const statusEl = $('msStatus');

    const printModalEl = $('printOptionsModal');
    const printCloseBtn = $('printOptionsCloseBtn');
    const printCancelBtn = $('printOptionsCancelBtn');
    const printApplyBtn = $('printOptionsApplyBtn');
    const poProjectTypeEl = $('poProjectType');
    const poPaperSizeEl = $('poPaperSize');
    const poColorModeEl = $('poColorMode');
    const poFinishEl = $('poFinish');
    const poGsmEl = $('poGsm');
    const poOrientationEl = $('poOrientation');
    const poQuantityEl = $('poQuantity');
    const poPromoMsgEl = $('poPromoMsg');

    if (!roleEl || !stageEl || !fileEl || !dropzoneEl || !selectedFileEl || !noteEl || !saveBtn || !clearBtn) {
        if (statusEl) statusEl.textContent = 'Status: not initialized (missing elements)';
        return;
    }

    let selectedPrintOptions = null;

    const escapeHtml = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const fmtBytes = (bytes) => `${(Number(bytes || 0) / 1024).toFixed(1)} KB`;
    const isPdfFile = (file) => !!file && ((file.type || '').toLowerCase() === 'application/pdf' || (file.name || '').toLowerCase().endsWith('.pdf'));

    function updateOverlayPromo(quantity) {
        if (!poPromoMsgEl) return;
        const qty = Number(quantity) || 0;
        if (qty > 2026) {
            poPromoMsgEl.textContent = 'Promo unlocked: Free limited edition bookmarks will be included.';
            poPromoMsgEl.style.color = 'var(--success)';
            poPromoMsgEl.style.fontWeight = '700';
            return;
        }
        poPromoMsgEl.textContent = 'Promo unlocked above quantity 2026: Free limited edition bookmarks.';
        poPromoMsgEl.style.color = 'var(--text-sub)';
        poPromoMsgEl.style.fontWeight = '400';
    }

    function renderPrintOptionsSummary() {
        if (!printSummaryEl) return;
        if (!selectedPrintOptions) {
            printSummaryEl.textContent = 'No print options selected yet.';
            return;
        }
        const p = selectedPrintOptions;
        printSummaryEl.textContent = `Type: ${p.projectType}, ${p.size}, ${p.color}, ${p.finish}, ${p.gsm} GSM, ${p.orientation}, Qty: ${p.quantity}`;
    }

    function deriveJobTypeFromPrintOptions(options) {
        if (!options) return 'Academic';
        if (options.projectType && options.projectType !== 'Auto') return options.projectType;
        const color = String(options.color || '').toLowerCase();
        const finish = String(options.finish || '').toLowerCase();
        const size = String(options.size || '').toUpperCase();
        if (color.includes('spot') || finish.includes('super')) return 'Promotional';
        if (size === 'A5' || color.includes('mono')) return 'Trade';
        return 'Academic';
    }

    function openPrintOptionsModal() {
        if (!printModalEl) return;
        updateOverlayPromo(poQuantityEl ? poQuantityEl.value : 0);
        printModalEl.classList.add('is-open');
        printModalEl.setAttribute('aria-hidden', 'false');
    }

    function closePrintOptionsModal() {
        if (!printModalEl) return;
        printModalEl.classList.remove('is-open');
        printModalEl.setAttribute('aria-hidden', 'true');
    }

    function appendPreviewCard(file) {
        if (!previewContainerEl || !file) return;
        const card = document.createElement('div');
        card.innerHTML = `
            <div style="width:100px; height:140px; border:1px solid #ddd; background:#f9f9f9; border-radius:6px; padding:6px; overflow:hidden;">
                <p style="font-size:10px; line-height:1.3; margin:0; word-break:break-word;">${escapeHtml(file.name)}</p>
            </div>
            <span style="font-size:12px;">${fmtBytes(file.size)}</span>
        `;
        previewContainerEl.appendChild(card);
    }

    function setSelectedFileLabel() {
        const file = fileEl.files && fileEl.files[0];
        selectedFileEl.textContent = file ? `${file.name} (${fmtBytes(file.size)})` : 'No file selected';
        if (!file) return;
        appendPreviewCard(file);
        showToast('Upload queued', `${file.name} ready for backend upload`, 'success', 1800);
        if (isPdfFile(file)) openPrintOptionsModal();
    }

    function addVersion() {
        const file = fileEl.files && fileEl.files[0];
        if (!file) {
            showToast('No file selected', 'Choose a file first, then upload manuscript.', 'warning');
            return;
        }
        if (!isPdfFile(file)) {
            showToast('PDF required', 'Please upload a PDF to create a manuscript job entry.', 'warning');
            return;
        }

        const job = {
            id: generateId(),
            client: `${roleEl.value || 'Author'} Upload`,
            title: file.name.replace(/\.pdf$/i, ''),
            type: deriveJobTypeFromPrintOptions(selectedPrintOptions),
            quantity: selectedPrintOptions && selectedPrintOptions.quantity > 0 ? selectedPrintOptions.quantity : 1,
            priority: 'Normal',
            stage: 0,
            substep: 0,
            createdAt: Date.now()
        };

        jobs.unshift(job);
        persistJobs();
        renderDashboard();
        fileEl.value = '';
        noteEl.value = '';
        selectedFileEl.textContent = 'No file selected';
        showToast('Manuscript uploaded', `${file.name} added to production list at Manuscript stage.`, 'success');
    }

    function clearAll() {
        confirmDialog({
            title: 'Clear uploads?',
            message: 'This removes manuscript uploads from this screen.',
            confirmText: 'Clear uploads'
        }).then((ok) => {
            if (!ok) return;
            if (previewContainerEl) previewContainerEl.innerHTML = '';
            fileEl.value = '';
            noteEl.value = '';
            selectedFileEl.textContent = 'No file selected';
            selectedPrintOptions = null;
            renderPrintOptionsSummary();
            showToast('Uploads cleared', 'Manuscript uploads removed.', 'warning');
        });
    }

    function wireDropzone() {
        const openPicker = () => fileEl.click();
        dropzoneEl.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                openPicker();
            }
        });
        fileEl.addEventListener('change', setSelectedFileLabel);
        dropzoneEl.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropzoneEl.classList.add('is-dragover');
        });
        dropzoneEl.addEventListener('dragleave', () => dropzoneEl.classList.remove('is-dragover'));
        dropzoneEl.addEventListener('drop', (e) => {
            e.preventDefault();
            dropzoneEl.classList.remove('is-dragover');
            const files = e.dataTransfer && e.dataTransfer.files;
            if (!files || !files.length) return;
            fileEl.files = files;
            setSelectedFileLabel();
        });
    }

    if (poQuantityEl) poQuantityEl.addEventListener('input', () => updateOverlayPromo(poQuantityEl.value));
    if (printCloseBtn) printCloseBtn.addEventListener('click', closePrintOptionsModal);
    if (printCancelBtn) printCancelBtn.addEventListener('click', closePrintOptionsModal);
    if (printModalEl) {
        printModalEl.addEventListener('click', (e) => {
            if (e.target === printModalEl) closePrintOptionsModal();
        });
    }
    if (printApplyBtn) {
        printApplyBtn.addEventListener('click', () => {
            selectedPrintOptions = {
                projectType: poProjectTypeEl ? poProjectTypeEl.value : 'Auto',
                size: poPaperSizeEl ? poPaperSizeEl.value : 'A4',
                color: poColorModeEl ? poColorModeEl.value : 'CMYK',
                finish: poFinishEl ? poFinishEl.value : 'Satin',
                gsm: poGsmEl ? poGsmEl.value : '80',
                orientation: poOrientationEl ? poOrientationEl.value : 'Portrait',
                quantity: poQuantityEl ? Number(poQuantityEl.value || 0) : 0
            };
            renderPrintOptionsSummary();
            closePrintOptionsModal();
            showToast('Print options saved', 'PDF print configuration applied.', 'success');
        });
    }

    saveBtn.addEventListener('click', addVersion);
    clearBtn.addEventListener('click', clearAll);
    wireDropzone();
    renderPrintOptionsSummary();
    if (statusEl) statusEl.textContent = 'Status: ready';
}

function wireJobTableTools() {
    ['jobSearch', 'jobTypeFilter', 'jobStageFilter', 'jobSort'].forEach((id) => {
        const el = $(id);
        if (!el) return;
        el.addEventListener('input', renderDashboard);
        el.addEventListener('change', renderDashboard);
    });
}

function initNewOrderCreation() {
    const root = $('newOrderCreationTab');
    if (!root) return;

    const openWindowLink = $('nocOpenWindowLink');
    const closeWindowBtn = $('nocWindowCloseBtn');
    const stepWorkspace = $('nocStepWorkspace');
    const stepCalc = $('nocStepCalc');
    const stepPayment = $('nocStepPayment');
    const stepSuccess = $('nocStepSuccess');

    const uploadFile = $('nocUploadFile');
    const uploadDropzone = $('nocUploadDropzone');
    const selectedFile = $('nocSelectedFile');
    const previewContainer = $('nocPreviewContainer');
    const uploadRequiredMsg = $('nocUploadRequiredMsg');

    const proceedToCalcBtn = $('nocProceedToCalcBtn');
    const proceedToPayBtn = $('nocProceedToPayBtn');
    const completePaymentBtn = $('nocCompletePaymentBtn');
    const backHomeBtn = $('nocBackHomeBtn');

    const successDetailsEl = $('nocSuccessDetails');
    const totalCostEl = $('nocTotalCost');
    const costPerCopyEl = $('nocCostPerCopy');
    const payableCostEl = $('nocPayableCost');
    const confirmedCostEl = $('nocConfirmedCost');
    const breakdownEl = $('nocBreakdown');

    const lightbox = $('nocLightbox');
    const lightboxImage = $('nocLightboxImage');

    const paymentOptions = document.querySelectorAll('input[name="nocPaymentMethod"]');

    let selectedFileName = '';
    let finalizedOrder = null;
    const pricingMatrix = {
        // Rates tuned for contemporary short-run and commercial print pricing patterns seen in Kolkata/WB.
        productBase: { 'Trade': 78, 'Photo Book': 220, 'Magazine': 64 },
        sizeFactor: { '6x9 Portrait': 1, '8x10 Portrait': 1.2, '10x8 Landscape': 1.18, '12x12 Square': 1.5 },
        paperRate: { 'Uncoated 70': 0.38, 'Uncoated 90': 0.46, 'Matte 120': 0.68, 'Gloss 150': 0.92 },
        coverType: { 'Softcover': 24, 'Hardcover': 88, 'Imagewrap': 165, 'Dust Jacket': 130 },
        coverFinish: { 'Matte': 14, 'Gloss': 18 },
        printingType: {
            'Digital': { setup: 900, perCopy: 14 },
            'Offset': { setup: 5200, perCopy: 8 },
            'Web': { setup: 3900, perCopy: 6.5 },
            'Sheetfed': { setup: 2700, perCopy: 9.5 }
        },
        colorFactor: { 'B&W': 1, 'Color': 1.62 },
        bindingType: { 'Perfect Bound': 22, 'Saddle Stitch': 14, 'Case Bound': 36, 'Spiral': 20 }
    };

    const fields = {
        productType: $('nocProductType'),
        sizeOrientation: $('nocSizeOrientation'),
        paperType: $('nocPaperType'),
        coverType: $('nocCoverType'),
        coverFinish: $('nocCoverFinish'),
        printingType: $('nocPrintingType'),
        colorMode: $('nocColorMode'),
        bindingType: $('nocBindingType'),
        pageCount: $('nocPageCount'),
        quantity: $('nocQuantity')
    };

    let lastEstimate = { perCopy: 0, total: 0 };

    function formatInr(value) {
        return `INR ${Number(value).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }

    function getSelectedPaymentMethod() {
        const selected = Array.from(paymentOptions).find((el) => el.checked);
        return selected ? selected.value : 'cod';
    }

    function methodLabel(method) {
        if (method === 'upi') return 'UPI';
        if (method === 'card') return 'Card';
        if (method === 'netbanking') return 'Net Banking';
        return 'Cash on Delivery';
    }

    function closeWindow() {
        root.classList.remove('is-window-open');
        root.setAttribute('aria-hidden', 'true');
        setStep(stepWorkspace);
    }

    function openWindow() {
        root.classList.add('is-window-open');
        root.setAttribute('aria-hidden', 'false');
        setStep(stepWorkspace);
    }

    function setStep(activeStepEl) {
        [stepWorkspace, stepCalc, stepPayment, stepSuccess].forEach((step) => {
            if (!step) return;
            step.classList.toggle('is-active', step === activeStepEl);
        });
    }

    function toKb(size) {
        return `${(Number(size || 0) / 1024).toFixed(1)} KB`;
    }

    function isPdf(file) {
        if (!file) return false;
        const type = String(file.type || '').toLowerCase();
        const name = String(file.name || '').toLowerCase();
        return type === 'application/pdf' || name.endsWith('.pdf');
    }

    async function getPdfPageCount(file) {
        try {
            const buffer = await file.arrayBuffer();
            const bytes = new Uint8Array(buffer);
            let text = '';
            for (let i = 0; i < bytes.length; i++) text += String.fromCharCode(bytes[i]);
            const matches = text.match(/\/Type\s*\/Page\b/g);
            return matches ? matches.length : 1;
        } catch (_err) {
            return 1;
        }
    }

    async function addPreview(file) {
        if (!previewContainer || !file) return;
        const pageCount = await getPdfPageCount(file);
        const previewUrl = URL.createObjectURL(file);
        const card = document.createElement('div');
        card.className = 'noc-preview-card';
        card.setAttribute('data-file-name', file.name);
        card.innerHTML = `
            <button type="button" class="noc-preview-remove" aria-label="Cancel uploaded PDF">&times;</button>
            <strong>${String(file.name).replace(/</g, '&lt;').replace(/>/g, '&gt;')}</strong>
            <div class="noc-preview-frame-wrap">
                <embed src="${previewUrl}#page=1&toolbar=0&navpanes=0&scrollbar=0" type="application/pdf" class="noc-preview-frame">
            </div>
            <span>${toKb(file.size)} • ${pageCount} page(s)</span>
        `;
        const removeBtn = card.querySelector('.noc-preview-remove');
        if (removeBtn) {
            removeBtn.addEventListener('click', () => {
                URL.revokeObjectURL(previewUrl);
                card.remove();
                if (uploadFile && uploadFile.files && uploadFile.files[0] && uploadFile.files[0].name === file.name) {
                    uploadFile.value = '';
                    selectedFile.textContent = 'No file selected';
                    selectedFileName = '';
                }
            });
        }
        previewContainer.appendChild(card);
    }

    async function handleFileSelection() {
        if (!uploadFile || !selectedFile) return;
        const file = uploadFile.files && uploadFile.files[0];
        if (!file) {
            selectedFile.textContent = 'No file selected';
            return;
        }
        if (!isPdf(file)) {
            selectedFile.textContent = 'No file selected';
            uploadFile.value = '';
            if (uploadRequiredMsg) {
                uploadRequiredMsg.hidden = false;
                uploadRequiredMsg.textContent = 'Upload required (PDF only)';
            }
            showToast('Invalid format', 'Please upload PDF format only.', 'warning');
            return;
        }
        if (uploadRequiredMsg) uploadRequiredMsg.hidden = true;
        selectedFile.textContent = file ? `${file.name} (${toKb(file.size)})` : 'No file selected';
        selectedFileName = file.name;
        await addPreview(file);
    }

    function calculateEstimate() {
        const product = fields.productType?.value || 'Trade';
        const size = fields.sizeOrientation?.value || '6x9 Portrait';
        const paper = fields.paperType?.value || 'Uncoated 70';
        const cover = fields.coverType?.value || 'Softcover';
        const finish = fields.coverFinish?.value || 'Matte';
        const printing = fields.printingType?.value || 'Digital';
        const color = fields.colorMode?.value || 'B&W';
        const binding = fields.bindingType?.value || 'Perfect Bound';
        const pageCount = Math.max(20, Number(fields.pageCount?.value || 20));
        const quantity = Math.max(1, Number(fields.quantity?.value || 1));

        const base = pricingMatrix.productBase[product] || 0;
        const pageCost = pageCount * (pricingMatrix.paperRate[paper] || 0);
        const coverCost = (pricingMatrix.coverType[cover] || 0) + (pricingMatrix.coverFinish[finish] || 0);
        const printConfig = pricingMatrix.printingType[printing] || { setup: 0, perCopy: 0 };
        const bindingCost = pricingMatrix.bindingType[binding] || 0;
        const sizeFactor = pricingMatrix.sizeFactor[size] || 1;
        const colorFactor = pricingMatrix.colorFactor[color] || 1;
        const discount = quantity >= 5000 ? 0.85 : quantity >= 2000 ? 0.89 : quantity >= 1000 ? 0.92 : quantity >= 500 ? 0.95 : quantity >= 200 ? 0.97 : 1;

        const preColorPerCopy = (base + pageCost + coverCost + printConfig.perCopy + bindingCost) * sizeFactor;
        const perCopy = preColorPerCopy * colorFactor;
        const total = (perCopy * quantity * discount) + printConfig.setup;

        return {
            perCopy,
            total,
            breakdown: {
                'Base Product': base,
                'Page Stock Cost': pageCost,
                'Cover + Finish': coverCost,
                'Printing Run Cost': printConfig.perCopy,
                'Binding Cost': bindingCost,
                'Size Multiplier': sizeFactor,
                'Color Multiplier': colorFactor,
                'Setup Cost': printConfig.setup,
                'Quantity Discount Factor': discount
            }
        };
    }

    function renderEstimate() {
        const result = calculateEstimate();
        lastEstimate = { perCopy: result.perCopy, total: result.total };

        if (costPerCopyEl) costPerCopyEl.textContent = formatInr(result.perCopy);
        if (totalCostEl) totalCostEl.textContent = formatInr(result.total);
        if (payableCostEl) payableCostEl.textContent = formatInr(result.total);
        if (confirmedCostEl) confirmedCostEl.textContent = formatInr(result.total);

        if (!breakdownEl) return;
        breakdownEl.innerHTML = '';
        Object.entries(result.breakdown).forEach(([label, value]) => {
            const row = document.createElement('div');
            row.className = 'noc-breakdown-row';
            const numeric = Number(value);
            const shown = label.includes('Multiplier') || label.includes('Factor') ? String(value) : formatInr(numeric);
            row.innerHTML = `<span>${label}</span><strong>${shown}</strong>`;
            breakdownEl.appendChild(row);
        });
    }

    function updateUpiQr() {
        const amount = Number(lastEstimate.total || 0).toFixed(2);
        const upiId = 'mkprint@upi';
        const payload = encodeURIComponent(`upi://pay?pa=${upiId}&pn=MK Print Solutions&am=${amount}&cu=INR`);
        const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${payload}`;
        const upiQr = $('nocUpiQr');
        const upiIdEl = $('nocUpiId');
        if (upiQr) upiQr.src = qrSrc;
        if (upiIdEl) upiIdEl.textContent = upiId;
    }

    function setPaymentPane(method) {
        const panes = {
            cod: $('nocPayPaneCod'),
            upi: $('nocPayPaneUpi'),
            card: $('nocPayPaneCard'),
            netbanking: $('nocPayPaneNet')
        };
        Object.entries(panes).forEach(([key, el]) => {
            if (!el) return;
            el.hidden = key !== method;
        });
        if (method === 'upi') updateUpiQr();
    }

    if (uploadFile) uploadFile.addEventListener('change', handleFileSelection);
    if (uploadDropzone && uploadFile) {
        uploadDropzone.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                uploadFile.click();
            }
        });
        uploadDropzone.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadDropzone.classList.add('is-dragover');
        });
        uploadDropzone.addEventListener('dragleave', () => uploadDropzone.classList.remove('is-dragover'));
        uploadDropzone.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadDropzone.classList.remove('is-dragover');
            const files = e.dataTransfer && e.dataTransfer.files;
            if (!files || !files.length) return;
            uploadFile.files = files;
            const dropped = uploadFile.files && uploadFile.files[0];
            if (!isPdf(dropped)) {
                uploadFile.value = '';
                selectedFile.textContent = 'No file selected';
                if (uploadRequiredMsg) {
                    uploadRequiredMsg.hidden = false;
                    uploadRequiredMsg.textContent = 'Upload required (PDF only)';
                }
                showToast('Invalid format', 'Please upload PDF format only.', 'warning');
                return;
            }
            handleFileSelection();
        });
    }

    Object.values(fields).forEach((el) => {
        if (!el) return;
        el.addEventListener('input', renderEstimate);
        el.addEventListener('change', renderEstimate);
    });

    paymentOptions.forEach((option) => {
        option.addEventListener('change', () => setPaymentPane(option.value));
    });

    const lightboxTriggers = document.querySelectorAll('.noc-lightbox-trigger');
    lightboxTriggers.forEach((img) => {
        img.addEventListener('click', () => {
            if (!lightbox || !lightboxImage) return;
            lightboxImage.src = img.src;
            lightbox.classList.add('is-open');
            lightbox.setAttribute('aria-hidden', 'false');
        });
    });
    if (lightbox) {
        lightbox.addEventListener('click', () => {
            lightbox.classList.remove('is-open');
            lightbox.setAttribute('aria-hidden', 'true');
        });
    }

    if (proceedToCalcBtn) {
        proceedToCalcBtn.addEventListener('click', () => {
            const hasFile = uploadFile && uploadFile.files && uploadFile.files[0];
            if (!hasFile) {
                if (uploadRequiredMsg) {
                    uploadRequiredMsg.hidden = false;
                    uploadRequiredMsg.textContent = 'Upload required';
                }
                showToast('Upload required', 'Please upload a file before proceeding.', 'warning');
                return;
            }
            if (uploadRequiredMsg) uploadRequiredMsg.hidden = true;
            renderEstimate();
            setStep(stepCalc);
        });
    }

    if (proceedToPayBtn) {
        proceedToPayBtn.addEventListener('click', () => {
            renderEstimate();
            setStep(stepPayment);
        });
    }

    if (completePaymentBtn) {
        completePaymentBtn.addEventListener('click', () => {
            const method = getSelectedPaymentMethod();
            const newId = generateId();
            const productType = fields.productType?.value || 'Trade';
            const jobTitle = (selectedFileName || 'Untitled Job').replace(/\.[^.]+$/, '');
            const qty = Math.max(1, Number(fields.quantity?.value || 1));
            const pageCount = Math.max(20, Number(fields.pageCount?.value || 20));
            const result = calculateEstimate();

            const jobType = productType === 'Trade' ? 'Trade' : 'Promotional';
            const job = {
                id: newId,
                client: 'New Order Creation',
                title: jobTitle,
                type: jobType,
                quantity: qty,
                stage: 0,
                substep: 0,
                priority: 'Normal',
                createdAt: Date.now(),
                orderMeta: {
                    productType,
                    sizeOrientation: fields.sizeOrientation?.value || '',
                    paperType: fields.paperType?.value || '',
                    coverType: fields.coverType?.value || '',
                    coverFinish: fields.coverFinish?.value || '',
                    printingType: fields.printingType?.value || '',
                    colorMode: fields.colorMode?.value || '',
                    bindingType: fields.bindingType?.value || '',
                    pageCount,
                    quantity: qty,
                    paymentMethod: method
                }
            };

            jobs.unshift(job);
            persistJobs();
            renderDashboard();

            finalizedOrder = {
                id: newId,
                title: jobTitle,
                productType,
                sizeOrientation: fields.sizeOrientation?.value || '',
                paperType: fields.paperType?.value || '',
                coverType: fields.coverType?.value || '',
                coverFinish: fields.coverFinish?.value || '',
                printingType: fields.printingType?.value || '',
                colorMode: fields.colorMode?.value || '',
                bindingType: fields.bindingType?.value || '',
                pageCount,
                quantity: qty,
                paymentMethod: methodLabel(method),
                costPerCopy: result.perCopy,
                total: result.total
            };

            if (successDetailsEl) {
                successDetailsEl.innerHTML = `
                    <div class="noc-details-row"><span>Job ID</span><strong>${finalizedOrder.id}</strong></div>
                    <div class="noc-details-row"><span>Title</span><strong>${finalizedOrder.title}</strong></div>
                    <div class="noc-details-row"><span>Product Type</span><strong>${finalizedOrder.productType}</strong></div>
                    <div class="noc-details-row"><span>Size & Orientation</span><strong>${finalizedOrder.sizeOrientation}</strong></div>
                    <div class="noc-details-row"><span>Paper</span><strong>${finalizedOrder.paperType}</strong></div>
                    <div class="noc-details-row"><span>Cover</span><strong>${finalizedOrder.coverType} / ${finalizedOrder.coverFinish}</strong></div>
                    <div class="noc-details-row"><span>Printing</span><strong>${finalizedOrder.printingType} / ${finalizedOrder.colorMode}</strong></div>
                    <div class="noc-details-row"><span>Binding</span><strong>${finalizedOrder.bindingType}</strong></div>
                    <div class="noc-details-row"><span>Pages × Qty</span><strong>${finalizedOrder.pageCount} × ${finalizedOrder.quantity}</strong></div>
                    <div class="noc-details-row"><span>Payment Mode</span><strong>${finalizedOrder.paymentMethod}</strong></div>
                    <div class="noc-details-row"><span>Cost Per Copy</span><strong>${formatInr(finalizedOrder.costPerCopy)}</strong></div>
                    <div class="noc-details-row"><span>Total Cost</span><strong>${formatInr(finalizedOrder.total)}</strong></div>
                `;
            }
            if (confirmedCostEl) confirmedCostEl.textContent = formatInr(result.total);
            setStep(stepSuccess);
        });
    }

    if (backHomeBtn) {
        backHomeBtn.addEventListener('click', () => {
            window.location.href = 'index.html';
        });
    }

    if (openWindowLink) {
        openWindowLink.addEventListener('click', (e) => {
            e.preventDefault();
            openWindow();
        });
    }
    if (closeWindowBtn) closeWindowBtn.addEventListener('click', closeWindow);

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && root.classList.contains('is-window-open')) closeWindow();
    });

    renderEstimate();
    setPaymentPane('cod');
    setStep(stepWorkspace);
    root.setAttribute('aria-hidden', 'true');
}

renderDashboard();
initManuscriptWorkspace();
wireJobTableTools();
initNewOrderCreation();

const follower = document.querySelector('.cursor-follower');

document.addEventListener('mousemove', (e) => {
    if (follower) {
        follower.style.left = e.clientX + 'px';
        follower.style.top = e.clientY + 'px';
    }
});
