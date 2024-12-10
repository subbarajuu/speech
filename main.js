class MarksEntry {
    constructor() {
        this.recognition = null;
        this.isListening = false;
        this.setupSpeechRecognition();
        this.setupEventListeners();
    }

    setupSpeechRecognition() {
        if ('webkitSpeechRecognition' in window) {
            this.recognition = new webkitSpeechRecognition();
            this.recognition.continuous = true;
            this.recognition.interimResults = true;
            this.recognition.lang = 'en-US';

            this.recognition.onresult = (event) => {
                const result = event.results[event.results.length - 1];
                if (result.isFinal) {
                    this.processInput(result[0].transcript.toLowerCase());
                }
            };

            this.recognition.onerror = (event) => {
                this.updateStatus('Error: ' + event.error, true);
            };
        } else {
            this.updateStatus('Speech recognition not supported in this browser', true);
        }
    }

    setupEventListeners() {
        document.getElementById('startBtn').addEventListener('click', () => this.startRecording());
        document.getElementById('stopBtn').addEventListener('click', () => this.stopRecording());
        document.getElementById('downloadBtn').addEventListener('click', () => this.downloadExcel());
    }

    startRecording() {
        if (this.recognition) {
            this.recognition.start();
            this.isListening = true;
            document.getElementById('startBtn').disabled = true;
            document.getElementById('stopBtn').disabled = false;
            this.updateStatus('Listening... Speak marks in format: "Roll number X question Y Z marks"');
        }
    }

    stopRecording() {
        if (this.recognition) {
            this.recognition.stop();
            this.isListening = false;
            document.getElementById('startBtn').disabled = false;
            document.getElementById('stopBtn').disabled = true;
            this.updateStatus('Recording stopped');
        }
    }

    async processInput(input) {
        const regex = /(?:roll|role|rol|rule|rel)\s*(?:number)?\s*(\d+)\s*(?:question|q)\s*([1-4])\s*(\d+)\s*(?:marks?)?/i;
        const match = input.match(regex);

        if (match) {
            const rollNumber = match[1];
            const question = parseInt(match[2]);
            const marks = parseInt(match[3]);

            if (marks >= 0 && marks <= 10) {
                await this.updateMarks(rollNumber, question, marks);
                this.updateStatus(`Recorded: Roll ${rollNumber}, Q${question}: ${marks} marks`);
            } else {
                this.updateStatus('Invalid marks. Marks should be between 0 and 10.', true);
            }
        } else {
            this.updateStatus('Could not understand input. Please use format: "Roll number X question Y Z marks"', true);
        }
    }

    async updateMarks(rollNumber, question, marks) {
        try {
            const response = await fetch('/api/update_marks', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    rollNumber,
                    question,
                    marks
                })
            });

            if (!response.ok) {
                throw new Error('Failed to update marks');
            }

            const data = await response.json();
            this.updateTable(data.marksData);
        } catch (error) {
            this.updateStatus('Error updating marks: ' + error.message, true);
        }
    }

    updateTable(marksData) {
        const tbody = document.querySelector('#marksTable tbody');
        tbody.innerHTML = '';

        Object.entries(marksData)
            .sort((a, b) => parseInt(a[0]) - parseInt(b[0]))
            .forEach(([rollNumber, marks]) => {
                const maxFirstPair = Math.max(marks.q1 ?? 0, marks.q2 ?? 0);
                const maxSecondPair = Math.max(marks.q3 ?? 0, marks.q4 ?? 0);
                const total = maxFirstPair + maxSecondPair;

                const row = tbody.insertRow();
                row.insertCell().textContent = rollNumber;
                row.insertCell().textContent = marks.q1 ?? '-';
                row.insertCell().textContent = marks.q2 ?? '-';
                row.insertCell().textContent = marks.q3 ?? '-';
                row.insertCell().textContent = marks.q4 ?? '-';
                row.insertCell().textContent = total;
            });
    }

    updateStatus(message, isError = false) {
        const statusDiv = document.getElementById('status');
        statusDiv.textContent = message;
        statusDiv.className = isError ? 'error' : this.isListening ? 'listening' : '';
    }

    async downloadExcel() {
        try {
            window.location.href = '/api/download_excel';
        } catch (error) {
            this.updateStatus('Error downloading Excel file: ' + error.message, true);
        }
    }
}

// Initialize the application
const marksEntry = new MarksEntry();