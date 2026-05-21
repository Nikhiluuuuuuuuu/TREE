document.addEventListener('DOMContentLoaded', function() {
    // Initialize user configuration in HTML
    initializeUserConfig();
    
    const elements = {
        folderTree: document.getElementById('folder-tree'),
        folderTreeContainer: document.getElementById('folder-tree-container'),
        dropArea: document.getElementById('drop-area'),
        copyButton: document.getElementById('copy-button'),
        counts: document.getElementById('counts'),
        dropMessage: document.getElementById('drop-message'),
        folderUpload: document.getElementById('folder-upload'),
        fileInputContainer: document.querySelector('.file-input-container'),
        toast: document.getElementById('toast'),
        closeButton: document.getElementById('close-button')
    };

    // Event Listeners
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        elements.dropArea.addEventListener(eventName, preventDefaults);
    });

    elements.dropArea.addEventListener('dragenter', () => updateDropArea(true));
    elements.dropArea.addEventListener('dragleave', () => updateDropArea(false));
    elements.dropArea.addEventListener('dragover', () => updateDropArea(true));
    elements.dropArea.addEventListener('drop', handleDrop);
    elements.copyButton.addEventListener('click', handleCopy);
    elements.folderUpload.addEventListener('change', handleFileUpload);
    elements.dropArea.addEventListener('click', e => {
        e.preventDefault();
        e.stopPropagation();
    });
    elements.closeButton.addEventListener('click', updateUIForEmptySelection);

    // Core Functions
    function initializeUserConfig() {
        const authorLink = document.getElementById('authorLink');
        const profileImage = document.getElementById('profileImage');
        
        authorLink.href = USER_CONFIG.profileUrl;
        authorLink.textContent = USER_CONFIG.username;
        profileImage.src = USER_CONFIG.profileImageUrl;
        profileImage.alt = `${USER_CONFIG.displayName}'s Profile Picture`;
    }

    function updateDropArea(isDragging) {
        elements.dropArea.classList.toggle('dragover', isDragging);
        elements.dropMessage.textContent = isDragging ? 
            "Drop folder here" : "Drag and drop a folder here";
    }

    async function handleDrop(e) {
        updateDropArea(false);
        elements.dropMessage.textContent = "Processing..";
        const files = Array.from(e.dataTransfer.files);
        await processFiles(files);
        elements.dropMessage.textContent = "Drag and drop a folder here";
    }

    async function handleFileUpload(event) {
        try {
            const files = Array.from(event.target.files);
            await processFiles(files);
        } catch (error) {
            console.error('Error processing files:', error);
            elements.folderTree.textContent = "Error processing folder structure.";
            elements.copyButton.style.display = "none";
        }
    }

    async function processFiles(files) {
        if (files.length === 0) {
            updateUIForEmptySelection();
            return;
        }

        const allPaths = collectDirectoryPaths(files);
        const {folderStructure, folderCount, fileCount} = buildFolderStructure(files, allPaths);
        const treeString = generateTree(folderStructure);

        updateUIWithResults(treeString, folderCount, fileCount);
    }

    // Helper Functions
    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    function collectDirectoryPaths(files) {
        const allPaths = new Set();
        files.forEach(file => {
            const path = file.webkitRelativePath || file.relativePath || file.name;
            const parts = path.split('/');
            let currentPath = '';
            for (let i = 0; i < parts.length - 1; i++) {
                currentPath = currentPath ? `${currentPath}/${parts[i]}` : parts[i];
                allPaths.add(currentPath);
            }
        });
        return allPaths;
    }

    function buildFolderStructure(files, allPaths) {
        const structure = {};
        let folderCount = 0;
        let fileCount = 0;

        // Create directory structure
        allPaths.forEach(path => {
            let current = structure;
            path.split('/').forEach(part => {
                if (!current[part]) {
                    current[part] = {};
                    folderCount++;
                }
                current = current[part];
            });
        });

        // Add files
        files.forEach(file => {
            const parts = (file.webkitRelativePath || file.relativePath || file.name).split('/');
            let current = structure;
            parts.forEach((part, i) => {
                if (!part) return;
                if (i === parts.length - 1) {
                    current[part] = null;
                    fileCount++;
                } else {
                    current = current[part];
                }
            });
        });

        return {folderStructure: structure, folderCount, fileCount};
    }

    function generateTree(structure) {
        return Object.keys(structure)
            .map((key, i, arr) => generateTreeString(key, structure[key], '', true, i === arr.length - 1))
            .join('');
    }

    function generateTreeString(name, structure, indent = '', isRoot = false, isLast = false) {
        const connector = isRoot ? '' : (isLast ? '└───' : '├───');
        let result = `${indent}${connector}${name}${structure === null ? '\n' : ':\n'}`;

        if (structure !== null) {
            const nextIndent = isRoot ? indent : indent + (isLast ? '    ' : '│   ');
            const items = Object.keys(structure).sort((a, b) => {
                const aIsDir = structure[a] !== null;
                const bIsDir = structure[b] !== null;
                return aIsDir === bIsDir ? a.localeCompare(b) : (bIsDir ? -1 : 1);
            });

            items.forEach((item, i) => {
                result += generateTreeString(item, structure[item], nextIndent, false, i === items.length - 1);
            });
        }
        return result;
    }

    function updateUIForEmptySelection() {
        elements.folderTree.textContent = "No folder selected.";
        elements.counts.textContent = "";
        elements.folderTreeContainer.style.display = "none";
        elements.copyButton.style.display = "none";
        elements.closeButton.style.display = "none";
        elements.dropArea.style.display = "flex";
        elements.fileInputContainer.style.display = "inline-block";
    }

    function updateUIWithResults(treeString, folderCount, fileCount) {
        elements.folderTree.textContent = treeString;
        elements.counts.textContent = `Folders: ${folderCount}; Files: ${fileCount}`;
        elements.folderTreeContainer.style.display = "block";
        elements.copyButton.style.display = "inline-block";
        elements.closeButton.style.display = "inline-flex";
        elements.dropArea.style.display = "none";
        elements.fileInputContainer.style.display = "none";
    }

    function showToast() {
        elements.toast.classList.add('show');
        setTimeout(() => elements.toast.classList.remove('show'), 3000);
    }

    async function handleCopy() {
        const textToCopy = elements.folderTree.textContent;
        const originalText = elements.copyButton.innerHTML;
        elements.copyButton.innerHTML = '<i class="fa-regular fa-copy"></i> Copied!';

        try {
            await navigator.clipboard.writeText(textToCopy);
            showToast();
        } catch (err) {
            console.error('Could not copy text: ', err);
        } finally {
            setTimeout(() => {
                elements.copyButton.innerHTML = originalText;
            }, 3000);
        }
    }
});
