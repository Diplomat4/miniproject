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
        renderDashboard();
        showToast('Sub-stage updated', `${job.id} \u2192 ${currentSubsteps[job.substep]}`, 'success');
        return;
    }

    if (job.stage < stages.length - 1) {
        job.stage++;
        job.substep = 0;
        const first = getSubstepsForStage(job.stage)[0];
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

renderDashboard();
initManuscriptWorkspace();
wireJobTableTools();

const follower = document.querySelector('.cursor-follower');

document.addEventListener('mousemove', (e) => {
    if (follower) {
        follower.style.left = e.clientX + 'px';
        follower.style.top = e.clientY + 'px';
    }
});