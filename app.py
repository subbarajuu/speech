from flask import Flask, render_template, jsonify, request, send_file
import pandas as pd
import os
from datetime import datetime
import json

app = Flask(__name__)

# Store marks data in memory (you might want to use a database in production)
marks_data = {}

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/update_marks', methods=['POST'])
def update_marks():
    try:
        data = request.json
        roll_number = str(data['rollNumber'])
        question = int(data['question'])
        marks = int(data['marks'])
        
        # Validate marks
        if not (0 <= marks <= 10):
            return jsonify({'error': 'Marks must be between 0 and 10'}), 400
        
        # Initialize student data if not exists
        if roll_number not in marks_data:
            marks_data[roll_number] = {'q1': None, 'q2': None, 'q3': None, 'q4': None}
        
        # Update marks
        marks_data[roll_number][f'q{question}'] = marks
        
        # Calculate total
        marks_dict = marks_data[roll_number]
        max_first_pair = max(marks_dict['q1'] or 0, marks_dict['q2'] or 0)
        max_second_pair = max(marks_dict['q3'] or 0, marks_dict['q4'] or 0)
        total = max_first_pair + max_second_pair
        
        return jsonify({
            'success': True,
            'marksData': marks_data,
            'total': total
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 400

@app.route('/api/get_marks')
def get_marks():
    return jsonify(marks_data)

@app.route('/api/download_excel')
def download_excel():
    try:
        # Convert marks data to DataFrame
        rows = []
        for roll_number, marks in marks_data.items():
            max_first_pair = max(marks['q1'] or 0, marks['q2'] or 0)
            max_second_pair = max(marks['q3'] or 0, marks['q4'] or 0)
            total = max_first_pair + max_second_pair
            
            rows.append({
                'Roll Number': roll_number,
                'Q1': marks['q1'],
                'Q2': marks['q2'],
                'Q3': marks['q3'],
                'Q4': marks['q4'],
                'Total': total
            })
        
        df = pd.DataFrame(rows)
        
        # Create Excel file
        filename = f'student_marks_{datetime.now().strftime("%Y%m%d_%H%M%S")}.xlsx'
        excel_path = os.path.join('static', 'downloads', filename)
        os.makedirs(os.path.dirname(excel_path), exist_ok=True)
        
        df.to_excel(excel_path, index=False)
        
        return send_file(excel_path, as_attachment=True)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True)