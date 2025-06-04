from flask import Flask, request, jsonify
from firebase_admin import credentials, firestore, initialize_app, auth, messaging, exceptions
from functools import wraps
import datetime
import os
import google.generativeai as genai
import cloudinary
import requests
import re
from apscheduler.schedulers.background import BackgroundScheduler
import firebase_admin
import requests
from google.oauth2 import service_account
from google.auth.transport.requests import Request
from flask_apscheduler import APScheduler
from dateutil import parser
#from datetime import timedelta
import openrouter
from openai import OpenAI
import calendar

import cloudinary.uploader
app = Flask(__name__)
scheduler = APScheduler()

# Initialize Firebase
cred_path = os.path.join(os.path.dirname(__file__), 'credentials', 'serviceAccountKey.json')
cred = credentials.Certificate(cred_path)
firebase_app = initialize_app(cred)
db = firestore.client()

client = OpenAI(
  base_url="https://openrouter.ai/api/v1",
  api_key="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",
)

# Middleware to verify Firebase token
def verify_token(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        auth_header = request.headers.get('Authorization', '')
        if not auth_header.startswith('Bearer '):
            return jsonify({'error': 'Invalid authorization header'}), 401
        
        token = auth_header.split('Bearer ')[1]
        try:
            # Verify the token
            decoded_token = auth.verify_id_token(token)
            # Add the user info to the request
            request.user = decoded_token
            return f(*args, **kwargs)
        except Exception as e:
            return jsonify({'error': f'Invalid token: {str(e)}'}), 401
    
    return decorated_function

SERVICE_ACCOUNT_FILE = cred_path  # Path to serviceAccountKey.json
credentials = service_account.Credentials.from_service_account_file(
    SERVICE_ACCOUNT_FILE, scopes=["https://www.googleapis.com/auth/cloud-platform"]
)

# Firebase FCM URL (HTTP v1)
PROJECT_ID = "spendcheck-c5952"
FCM_URL = f"https://fcm.googleapis.com/v1/projects/{PROJECT_ID}/messages:send"
FCM_SERVER_KEY = "SERVER_KEY"

def get_access_token():
    """Get OAuth2 access token for FCM HTTP v1 API."""
    auth_request = Request()
    credentials.refresh(auth_request)
    return credentials.token

def send_notification(token, title, body):
    try:
        # data = request.json
        # title = data.get("title", "Default Title")
        # body = data.get("body", "Default Body")
        # token = data.get("token")  # FCM Device Token

        if not token:
            return jsonify({"error": "FCM token is required"}), 400

        headers = {
            "Authorization": f"Bearer {get_access_token()}",
            "Content-Type": "application/json"
        }

        payload = {
            "message": {
                "token": token,
                "notification": {
                    "title": title,
                    "body": body
                },
                "android": {
                    "priority": "high",
                    # For Android, we use a different structure for big text
                    "notification": {
                        "channel_id": "default_channel", 
                        "title": title,
                        "body": body
                    }
                },
                "data": {
                    "full_message": body, 
                    "type": "transaction",
                    "transactionId": "abc123",
                    "body": body,
                    "customInfo": ""
                },
                "apns": {
                    "headers": {
                        "apns-priority": "10"
                    },
                    "payload": {
                        "aps": {
                            "alert": {
                                "title": title,
                                "body": body
                            },
                            "mutable-content": 1,
                            "sound": "default"
                        }
                    }
                }
            }
        }
        
        response = requests.post(FCM_URL, headers=headers, json=payload)
        print(response)
        print(token)
        if response.status_code == 200:
            return {"success": "Notification sent!", "response": response.json()}
        else:
            return {"error": "Failed to send notification", "details": response.json()}

    except Exception as e:
        print(f"Error sending notification: {e}")  # Log instead of returning a response
        return {"error": str(e)}
    
cloudinary.config(
  cloud_name="name",
  api_key="KEY",
  api_secret="API_SECRET"
)

@app.route('/upload', methods=['POST'])
def upload_file():
    print("oyyyyyyyyyyyyy")
    file = request.files['file']
    if not file:
        return jsonify({"error": "No file uploaded"}), 400

    # Upload to Cloudinary
    result = cloudinary.uploader.upload(file, resource_type="raw")
    
    return jsonify({"success": True, "url": result['secure_url']})

# Transaction routes
@app.route('/api/users/<user_id>/transactions', methods=['POST'])
@verify_token
def add_transaction(user_id):
    # Verify user_id matches the authenticated user
    print("okkk")
    if request.user['uid'] != user_id:
        return jsonify({'error': 'Unauthorized access'}), 403

    try:
        # Get data from request
        data = request.json
        print(data)
        # Validate required fields
        if 'amount' not in data or 'transactionType' not in data:
            return jsonify({'error': 'Missing required fields: amount and transactionType'}), 400
        
        transaction_type = data['transactionType']
        amount = float(data['amount'])
        print("hi")
        # Ensure category is provided for Expenses, but not required for Income
        if transaction_type == 'Expense' and 'category' not in data:
            print("hiii")
            return jsonify({'error': 'Missing category for Expense transactions'}), 400

        #print("hiii")
        # Convert date string to Firestore timestamp
        if 'date' in data and data['date']:
            print("🔹 Raw Date Input:", data['date'])
            try:
                print("nicee")
                transaction_date = datetime.datetime.fromisoformat(data['date'].replace('Z', '+00:00'))
                print(transaction_date)
            except ValueError:
                return jsonify({'error': 'Invalid date format'}), 400
        else:
            transaction_date = datetime.datetime.now()  # Default to current UTC time

        # Prepare transaction data
        transaction_data = {
            'amount': amount,
            'transactionType': transaction_type,  # Store whether it's Income or Expense
            'date': transaction_date,
            'createdAt': datetime.datetime.utcnow()
        }

        print(transaction_data)
        if transaction_type == 'Expense':
            transaction_data['category'] = data['category']  # Only for Expenses
        
        # Optional fields
        if 'notes' in data and data['notes']:
            transaction_data['notes'] = data['notes']

        if transaction_type == 'Expense' and 'paymentMethod' in data and data['paymentMethod']:
            transaction_data['paymentMethod'] = data['paymentMethod']

        # 🔹 Save Bill URL if Available
        if 'bill' in data and data['bill']:
            transaction_data['bill'] = {
                'url': data['bill']['url'],
                'uploadedAt': datetime.datetime.utcnow()
            }

        # Save to Firestore
        transaction_ref = db.collection('users').document(user_id).collection('transactions').document()
        transaction_ref.set(transaction_data)

        return jsonify({
            'success': True,
            'id': transaction_ref.id,
            'message': 'Transaction added successfully'
        }), 201

    except Exception as e:
        return jsonify({'error': str(e), 'message': 'Failed to add transaction'}), 500

@app.route('/api/users/<user_id>/transactions', methods=['GET'])
@verify_token
def get_transactions(user_id):
    print(user_id)
    # Verify user_id matches the token
    if request.user['uid'] != user_id:
        return jsonify({'error': 'Unauthorized access'}), 403
    
    try:
        # Get query parameters
        category = request.args.get('category')
        start_date = request.args.get('startDate')
        end_date = request.args.get('endDate')
        
        query = db.collection('users').document(user_id).collection('transactions')
        
        # Apply filters if provided
        if category:
            query = query.where('category', '==', category)
        
        if start_date:
            try:
                start = datetime.datetime.fromisoformat(start_date.replace('Z', '+00:00'))
                query = query.where('date', '>=', start)
            except ValueError:
                return jsonify({'error': 'Invalid start date format'}), 400
        
        if end_date:
            try:
                end = datetime.datetime.fromisoformat(end_date.replace('Z', '+00:00'))
                query = query.where('date', '<=', end)
            except ValueError:
                return jsonify({'error': 'Invalid end date format'}), 400
        
        # Order by date (newest first)
        query = query.order_by('date', direction=firestore.Query.DESCENDING)
        
        # Execute query
        docs = query.stream()
        
        # Process results
        transactions = []
        for doc in docs:
            transaction = doc.to_dict()
            transaction['id'] = doc.id
            transactions.append(transaction)
        
        # Return transactions
        return jsonify(transactions), 200
    
    except Exception as e:
        return jsonify({
            'error': str(e),
            'message': 'Failed to retrieve transactions'
        }), 500

app.route('/api/users/<user_id>/analytics/categories', methods=['GET'])
@verify_token
def get_category_analytics(user_id):
    # Verify user_id matches the token
    if request.user['uid'] != user_id:
        return jsonify({'error': 'Unauthorized access'}), 403
    
    try:
        # Get date range parameters
        start_date = request.args.get('startDate')
        end_date = request.args.get('endDate')
        
        # Create base query
        query = db.collection('users').document(user_id).collection('transactions')
        
        # Apply date filters if provided
        if start_date:
            try:
                start = datetime.datetime.fromisoformat(start_date.replace('Z', '+00:00'))
                query = query.where('date', '>=', start)
            except ValueError:
                return jsonify({'error': 'Invalid start date format'}), 400
        
        if end_date:
            try:
                end = datetime.datetime.fromisoformat(end_date.replace('Z', '+00:00'))
                query = query.where('date', '<=', end)
            except ValueError:
                return jsonify({'error': 'Invalid end date format'}), 400
        
        # Execute query
        docs = query.stream()
        
        # Process and group by category
        category_totals = {}
        total_spent = 0
        
        for doc in docs:
            data = doc.to_dict()
            amount = float(data.get('amount', 0))
            category = data.get('category', 'Uncategorized')
            
            if amount > 0:  # Assuming positive values are expenses
                if category not in category_totals:
                    category_totals[category] = 0
                
                category_totals[category] += amount
                total_spent += amount
        
        # Calculate percentages and prepare response
        result = []
        for category, amount in category_totals.items():
            percentage = (amount / total_spent * 100) if total_spent > 0 else 0
            result.append({
                'category': category,
                'amount': amount,
                'percentage': round(percentage, 2)
            })
        
        # Sort by amount (highest first)
        result.sort(key=lambda x: x['amount'], reverse=True)
        
        return jsonify({
            'categories': result,
            'totalSpent': total_spent
        }), 200
    
    except Exception as e:
        return jsonify({
            'error': str(e),
            'message': 'Failed to retrieve category analytics'
        }), 500

@app.route('/api/users/<user_id>/analytics/monthly', methods=['GET'])
@verify_token
def get_monthly_analytics(user_id):
    # Verify user_id matches the token
    if request.user['uid'] != user_id:
        return jsonify({'error': 'Unauthorized access'}), 403
    
    try:
        # Create base query
        query = db.collection('users').document(user_id).collection('transactions')
        
        # Get optional date range parameters
        start_date = request.args.get('startDate')
        end_date = request.args.get('endDate')
        
        # Apply date filters if provided
        if start_date:
            try:
                start = datetime.datetime.fromisoformat(start_date.replace('Z', '+00:00'))
                query = query.where('date', '>=', start)
            except ValueError:
                return jsonify({'error': 'Invalid start date format'}), 400
        
        if end_date:
            try:
                end = datetime.datetime.fromisoformat(end_date.replace('Z', '+00:00'))
                query = query.where('date', '<=', end)
            except ValueError:
                return jsonify({'error': 'Invalid end date format'}), 400
        
        # Execute query
        docs = query.stream()
        
        # Process and group by month
        monthly_data = {}
        
        for doc in docs:
            data = doc.to_dict()
            amount = float(data.get('amount', 0))
            category = data.get('category', 'Uncategorized')
            
            # Get the transaction date and format as month-year
            date_obj = data.get('date')
            if not date_obj:
                continue
                
            # Format as YYYY-MM
            month_key = date_obj.strftime('%Y-%m')
            month_name = date_obj.strftime('%b %Y')  # e.g., "Jan 2025"
            
            # Initialize month data if not exists
            if month_key not in monthly_data:
                monthly_data[month_key] = {
                    'month': month_name,
                    'total': 0,
                    'categories': {}
                }
            
            # Only count positive amounts as expenses
            if amount > 0:
                monthly_data[month_key]['total'] += amount
                
                # Track spending by category
                if category not in monthly_data[month_key]['categories']:
                    monthly_data[month_key]['categories'][category] = 0
                    
                monthly_data[month_key]['categories'][category] += amount
        
        # Convert to list and sort by date
        result = list(monthly_data.values())
        result.sort(key=lambda x: x['month'])
        
        # Calculate month-over-month changes
        for i in range(1, len(result)):
            prev_total = result[i-1]['total']
            current_total = result[i]['total']
            
            if prev_total > 0:
                change_pct = ((current_total - prev_total) / prev_total) * 100
                result[i]['change_percentage'] = round(change_pct, 2)
            else:
                result[i]['change_percentage'] = 0
        
        return jsonify({
            'months': result
        }), 200
    
    except Exception as e:
        return jsonify({
            'error': str(e),
            'message': 'Failed to retrieve monthly analytics'
        }), 500
    
@app.route('/api/users/<user_id>/transactions/monthly-analysis', methods=['GET'])
def get_monthly_analysis(user_id):
    try:
        # Get and validate date range from request parameters
        start_date_str = request.args.get('startDate')
        end_date_str = request.args.get('endDate')

        if not start_date_str or not end_date_str:
            return jsonify({"error": "startDate and endDate are required"}), 400

        try:
            start_date = datetime.datetime.strptime(start_date_str, "%Y-%m-%d")
            end_date = datetime.datetime.strptime(end_date_str, "%Y-%m-%d")
        except ValueError:
            return jsonify({"error": "Invalid date format. Use YYYY-MM-DD"}), 400

        # Fetch transactions from Firestore
        transactions_ref = db.collection('users').document(user_id).collection('transactions')
        transactions = transactions_ref.where('date', '>=', start_date).where('date', '<=', end_date).stream()

        # Process transactions
        monthly_totals = {}
        category_summary = {}
        all_transactions = []

        for doc in transactions:
            data = doc.to_dict()
            date = data.get('date')
            category = data.get('category', 'Uncategorized')
            amount = float(data.get('amount', 0))

            if amount <= 0:  # Only consider expenses
                continue

            # Convert Firestore timestamp to Python datetime
            if isinstance(date, datetime.datetime):
                transaction_date = date
            else:
                transaction_date = date.to_datetime()

            month_key = transaction_date.strftime('%Y-%m')  # Format as YYYY-MM
            month_label = transaction_date.strftime('%b %Y')  # Format as "Jan 2024"

            # Aggregate total spending per month
            if month_key not in monthly_totals:
                monthly_totals[month_key] = {"month": month_label, "total": 0, "rawMonth": month_key}
            monthly_totals[month_key]["total"] += amount

            # Aggregate category spending
            if category not in category_summary:
                category_summary[category] = 0
            category_summary[category] += amount

            # Store transaction details for further analysis
            all_transactions.append({
                "date": transaction_date.strftime("%Y-%m-%d"),
                "amount": amount,
                "category": category,
                "month": month_key
            })

        # Sort monthly totals by date
        sorted_months = sorted(monthly_totals.values(), key=lambda x: x["rawMonth"])

        return jsonify({
            "transactions": all_transactions,
            "categorySummary": category_summary,
            "monthlySummary": sorted_months
        }), 200

    except Exception as e:
        return jsonify({"error": str(e), "message": "Failed to retrieve monthly analytics"}), 500
    

OCR_API_KEY = "OCR_API_KEY"
GEMINI_API_KEY = "GEMINI_API_KEY"
UPLOAD_FOLDER = "uploads"
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'pdf'}

genai.configure(api_key=GEMINI_API_KEY)
def allowed_file(filename):
    """Check if file type is allowed."""
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def extract_text_from_ocr(file_url, file_type):
    payload = {
        "apikey": OCR_API_KEY,
        "url": file_url,
        "language": "eng",
        "filetype": file_type
    }

    response = requests.post(
        "https://api.ocr.space/parse/image",
        data=payload,
    )

    print(response)
    if response.status_code == 200:
        result = response.json()
        print(result)
        if "ParsedResults" in result and result["ParsedResults"]:
            print(result["ParsedResults"][0]["ParsedText"])
            return result["ParsedResults"][0]["ParsedText"]
    
    return None  # OCR failed

def extract_total_price(text):
    """Use Gemini AI to extract the total price from receipt text."""
    
    # Define the prompt for Gemini
    prompt = f"""
    Extract the total amount from this receipt text. The total amount usually appears near words like 'Total', 'Amount Due', 'Grand Total', or 'Balance'. 
    If multiple amounts are found, return only the most relevant one as a number. If no amount is found, return 'None'.
    
    Here is the receipt text:
    ```
    {text}
    ```

    Response format: Just return the amount as a number (e.g., 125.50).
    """

    try:
        # Call Gemini API
        model = genai.GenerativeModel("gemini-1.5-flash")
        response = model.generate_content(prompt)

        if response and response.text:
            # Extract numeric value from the response
            match = re.search(r"\d+[\.,]?\d*", response.text)
            if match:
                return float(match.group().replace(",", ""))
    
    except Exception as e:
        print("Error extracting total price with Gemini:", e)
    
    return None  # Return None if extraction fails


def detect_transaction_type(text):
    prompt = f"""
    You are an expert in financial analysis from the perspective of a person who is purchasing a service. Determine whether the following transaction is 'Income' or 'Expense' for the person making the purchase.

    Text: {text[:3000]}

    Respond with ONLY 'Income' or 'Expense', nothing else.
    """

    try:
        response = genai.GenerativeModel("gemini-1.5-flash").generate_content(prompt)
        transaction_type = response.text.strip()

        if transaction_type.lower() in ["income", "expense"]:
            return transaction_type.capitalize()
        return "Unknown"
    except Exception as e:
        return f"Error: {str(e)}"

def categorize_expense(text):
    """Use Gemini AI to determine expense category."""
    categories = [
        'Food & Dining', 'Transportation', 'Housing & Utilities', 'Shopping', 'Entertainment',
    'Health & Fitness', 'Education', 'Personal Care', 'Travel', 'Finance & Investment',
    'Gifts & Donations', 'Miscellaneous','custom'
    ]

    prompt = f"""
    You are an expert in financial categorization. Categorize the following transaction into one of these categories:
    {', '.join(categories)}

    Text: {text[:3000]}

    Respond with ONLY the category name, nothing else.
    """

    try:
        response = genai.GenerativeModel("gemini-1.5-flash").generate_content(prompt)
        category = response.text.strip()

        for cat in categories:
            if cat.lower() in category.lower():
                return cat
        return "Unknown Category"
    except Exception as e:
        return f"Error: {str(e)}"

@app.route('/extract-text', methods=['POST'])
def extract_text():
    data = request.json
    if 'fileUrl' not in data:
        return jsonify({"error": "No file URL provided"}), 400
    print(data)
    file_url = data['fileUrl']
    file_type = data.get("fileType", "image")
    print(file_url)
    extracted_text = extract_text_from_ocr(file_url, file_type)
    print(extracted_text)
    if not extracted_text:
        return jsonify({"error": "OCR extraction failed"}), 500

    transaction_type = detect_transaction_type(extracted_text)
    total_price = extract_total_price(extracted_text)
    category = categorize_expense(extracted_text) if transaction_type == "Expense" else None

    return jsonify({
        "success": True,
        "transactionType": transaction_type,
        "amount": total_price if total_price else "Not Found",
        "category": category
    })

@app.route('/parse-voice-text', methods=['POST'])
def parse_voice_text():
    print("hii")
    data = request.json
    if 'text' not in data:
        return jsonify({"error": "No text provided"}), 400

    extracted_text = data['text']
    print("Voice input text:", extracted_text)

    transaction_type = detect_transaction_type(extracted_text)
    total_price = extract_total_price(extracted_text)
    category = categorize_expense(extracted_text) if transaction_type == "Expense" else None

    return jsonify({
        "success": True,
        "transaction_type": transaction_type,
        "amount": total_price if total_price else "Not Found",
        "category": category
    })

@app.route('/api/users/<user_id>/budgets', methods=['POST'])
@verify_token
def set_budget(user_id):
    if request.user['uid'] != user_id:
        return jsonify({'error': 'Unauthorized access'}), 403

    try:
        data = request.json
        month = data.get('month')
        budgets = data.get('budgets', {})

        if not month or not budgets:
            return jsonify({'error': 'Missing required fields: month and budgets'}), 400

        # Firestore reference
        budget_ref = db.collection('users').document(user_id).collection('budgets').document(month)

        # Set or update the budget
        budget_ref.set({"month": month, "budgets": budgets}, merge=True)

        return jsonify({'success': True, 'message': 'Budget saved successfully'}), 201

    except Exception as e:
        return jsonify({'error': str(e), 'message': 'Failed to save budget'}), 500

@app.route('/api/users/<user_id>/budgets/<month>', methods=['GET'])
@verify_token
def get_budget(user_id, month):
    if request.user['uid'] != user_id:
        return jsonify({'error': 'Unauthorized access'}), 403

    try:
        budget_ref = db.collection('users').document(user_id).collection('budgets').document(month)
        budget_doc = budget_ref.get()

        if budget_doc.exists:
            return jsonify({'success': True, 'budget': budget_doc.to_dict()}), 200
        else:
            return jsonify({'success': False, 'message': 'No budget found for this month'}), 200  # Changed from 404

    except Exception as e:
        return jsonify({'error': str(e), 'message': 'Failed to fetch budget'}), 200  # Changed from 500

@app.route('/api/users/<user_id>/budgets', methods=['GET'])
@verify_token
def get_all_budgets(user_id):
    if request.user['uid'] != user_id:
        return jsonify({'error': 'Unauthorized access'}), 403

    try:
        budgets_ref = db.collection('users').document(user_id).collection('budgets')
        budgets = {doc.id: doc.to_dict() for doc in budgets_ref.stream()}

        return jsonify({'success': True, 'budgets': budgets}), 200

    except Exception as e:
        return jsonify({'error': str(e), 'message': 'Failed to fetch budgets'}), 500

@app.route('/api/users/<user_id>/budgets/<month>', methods=['DELETE'])
@verify_token
def delete_budget(user_id, month):
    if request.user['uid'] != user_id:
        return jsonify({'error': 'Unauthorized access'}), 403

    try:
        budget_ref = db.collection('users').document(user_id).collection('budgets').document(month)
        budget_ref.delete()

        return jsonify({'success': True, 'message': 'Budget deleted successfully'}), 200

    except Exception as e:
        return jsonify({'error': str(e), 'message': 'Failed to delete budget'}), 500

@app.route('/api/users/<user_id>/get_budget_summary/<month>', methods=['GET'])
@verify_token
def get_budget_summary(user_id, month):
    print("hiiii")
    if request.user['uid'] != user_id:
        return jsonify({"error": "User ID is required"}), 400
    print("ok")

    # Get monthly budget doc
    budget_ref = db.collection('users').document(user_id).collection('budgets').document(month)
    budget_doc = budget_ref.get()

    budgets = budget_doc.to_dict() if budget_doc.exists else {}
    print(budgets)

    transaction_ref = db.collection("users").document(user_id).collection("transactions")
    total_spent = {}

    transaction_docs = transaction_ref.stream()
    for doc in transaction_docs:
        data = doc.to_dict()
        txn_date = data.get("date")

        # ✅ Only include if date is a datetime and matches the target month
        if not isinstance(txn_date, datetime.datetime):
            continue

        if txn_date.strftime("%Y-%m") != month:
            continue

        category = data.get("category", "Uncategorized")
        amount = data.get("amount", 0)
        transaction_type = data.get("transactionType")

        # ✅ Only count expenses
        if transaction_type == "Expense":
            total_spent[category] = total_spent.get(category, 0) + amount

    print("h2")
    print(total_spent)
    return jsonify({
        "budgets": budgets,
        "spent": total_spent
    })

def get_budget_summary(user_id, month):
    """Fetch budget and expenses for a user in a given month."""
    budget_ref = db.collection('users').document(user_id).collection('budgets').document(month)
    budget_doc = budget_ref.get()
    budgets = budget_doc.to_dict() if budget_doc.exists else {}

    transaction_ref = db.collection("users").document(user_id).collection("transactions")
    total_spent = {}

    # Fetch transactions and sum spending per category
    transaction_docs = transaction_ref.stream()
    for doc in transaction_docs:
        data = doc.to_dict()
        txn_date = data.get("date")

        # ✅ Only include if date is a datetime and matches the target month
        if not isinstance(txn_date, datetime.datetime):
            continue

        if txn_date.strftime("%Y-%m") != month:
            continue

        category = data.get("category", "Uncategorized")
        amount = data.get("amount", 0)
        transaction_type = data.get("transactionType")

        # ✅ Only count expenses
        if transaction_type == "Expense":
            total_spent[category] = total_spent.get(category, 0) + amount

    return budgets, total_spent

def generate_ai_recommendation(category, spent, budget_limit):
    print("project")
    """Generate a personalized recommendation using Gemini AI."""
    prompt = f"""
    The user has spent {spent} out of their {budget_limit} budget in the {category} category.
    Suggest a budgeting tip to help them save money. Keep it short and actionable.
    """
    # response = genai.GenerativeModel("gemini-1.5-pro").generate_content(prompt)
    # return response.text.strip()

    response = client.chat.completions.create(
        extra_body={},
        model="google/gemma-3-12b-it:free",  # Use the Gemma 3 12B model
        messages=[
            {
            "role": "user",
            "content": [
                {
                "type": "text",
                "text": prompt# Pass the prompt variable here
                }
            ]
            }
        ]
    )

    print(response.choices[0].message.content)
    return response.choices[0].message.content

def generate_recommendation(category, spent, budget_limit):
    print("helllloooo")
    """Hybrid approach: rule-based for common categories, AI for new ones."""
    predefined_recommendations = {
        "food": "Try meal prepping to cut down on food expenses.",
        "entertainment": "Look for free or discounted entertainment options.",
        "shopping": "Postpone non-essential shopping to save more.",
        "transport": "Use public transport to reduce fuel costs."
    }

    return generate_ai_recommendation(category, spent, budget_limit)

def check_expense_limit():
    print(f"Checking expenses for users at {datetime.datetime.now()}")
    users_ref = db.collection("users")
    users = users_ref.stream()

    for user in users:
        user_data = user.to_dict()
        user_id = user.id
        fcm_token = user_data.get("fcmToken")  
        current_month = datetime.datetime.now().strftime("%Y-%m")

        if not fcm_token:
            print(f"User {user_id} does not have an FCM token.")
            continue

        budgets, total_spent = get_budget_summary(user_id, current_month)
        category_budgets = {
            category: int(amount) if str(amount).isdigit() and amount != '' else 0
            for category, amount in budgets.get('budgets', {}).items()
        }

        for category, spent in total_spent.items():
            budget_limit = category_budgets.get(category, 0)

            if budget_limit > 0:
                percentage_spent = (spent / budget_limit) * 100
                print(category," ", percentage_spent)
                # 90% Warning Notification
                if 90 <= percentage_spent < 100:
                    print("oyy")
                    recommendation = generate_recommendation(category, spent, budget_limit)  # Call function here
                    message = (f"You've already spent {int(percentage_spent)}% of your ₹{budget_limit} {category} budget this month!\n\n"
                               f"💡 Recommendation: {recommendation}")
                    send_notification(fcm_token, "Budget Warning!", message)
                # 100% Exceeded Notification
                elif spent > budget_limit:
                    send_notification(fcm_token, "Budget Limit Exceeded!", 
                                      f"You exceeded your {category} budget of ₹{budget_limit}. Try to control expenses.")

def format_spending_change(change, period="yesterday"):
    """Formats the percentage change to make it more readable."""
    if change is None:
        return f"No previous {period} data to compare."
    
    if change >= 100:
        return f"Your spending significantly increased compared to {period}."
    
    if change > 0:
        return f"Your spending increased by {change}% compared to {period}."
    
    if change < 0:
        return f"Your spending decreased by {abs(change)}% compared to {period}."
    
    return f"Your spending remains the same as {period}."

def calculate_spending_change(user_id, fcm_token):
    """Calculate daily & weekly spending change and trigger notifications if necessary."""
    
    today = datetime.datetime.now().date()
    yesterday = today - datetime.timedelta(days=1)
    start_of_week = today - datetime.timedelta(days=today.weekday())  # Monday of current week
    start_of_last_week = start_of_week - datetime.timedelta(days=7)  # Monday of last week
    end_of_last_week = start_of_week - datetime.timedelta(days=1)  # Last Sunday

    user_ref = db.collection("users").document(user_id)
    
    # Fetch transactions
    transactions_ref = user_ref.collection("transactions")
    transactions = transactions_ref.stream()

    # Track expenses
    today_expenses = 0
    yesterday_expenses = 0
    this_week_expenses = 0
    last_week_expenses = 0

    for doc in transactions:
        data = doc.to_dict()
        raw_date = data.get("date")

        if raw_date:
            date_obj = raw_date.date()
            amount = float(data.get("amount", 0))  # Ensure amount is a float

            if date_obj == today:
                today_expenses += amount
            if date_obj == yesterday:
                yesterday_expenses += amount
            if start_of_week <= date_obj <= today:
                this_week_expenses += amount
            if start_of_last_week <= date_obj <= end_of_last_week:
                last_week_expenses += amount

    # Function to calculate % change with handling for small/zero values
    def percentage_change(current, previous):
        if previous == 0:
            if current > 0:
                return None  # Avoid extreme % changes (e.g., "∞%" increase)
            return 0  # No change
        return round(((current - previous) / previous) * 100, 2)

    # Calculate changes
    daily_change = percentage_change(today_expenses, yesterday_expenses)
    weekly_change = percentage_change(this_week_expenses, last_week_expenses)

    # Get user-friendly messages
    daily_message = format_spending_change(daily_change, "yesterday")
    weekly_message = format_spending_change(weekly_change, "last week")

    # Trigger notifications only if the change is significant
    if daily_change is not None and abs(daily_change) > 10:
        send_notification(fcm_token, "📊 Daily Spending Alert!", daily_message)
    
    if weekly_change is not None and abs(weekly_change) > 10:
        send_notification(fcm_token, "📊 Weekly Spending Alert!", weekly_message)

    return {
        "today_expenses": today_expenses,
        "yesterday_expenses": yesterday_expenses,
        "daily_change": daily_change,
        "daily_message": daily_message,
        "this_week_expenses": this_week_expenses,
        "last_week_expenses": last_week_expenses,
        "weekly_change": weekly_change,
        "weekly_message": weekly_message
    }

def check_all_users():
    """Check spending for all users and notify them if necessary."""
    print("🔄 Running scheduled spending check...")

    users_ref = db.collection("users")
    users = users_ref.stream()

    for user in users:
        user_data = user.to_dict()
        user_id = user.id
        fcm_token = user_data.get("fcmToken")  # Fetch stored FCM token

        if fcm_token:
            calculate_spending_change(user_id, fcm_token)

def get_income_and_expenses(user_id, month):
    transactions_ref = db.collection("users").document(user_id).collection("transactions")
    transactions = transactions_ref.stream()

    total_income = 0
    total_expenses = 0
    category_expenses = {}

    for doc in transactions:
        data = doc.to_dict()
        txn_date = data.get("date")

        # ⛑️ Skip if date is missing or not a datetime
        if not isinstance(txn_date, datetime.datetime):
            continue

        if txn_date.strftime("%Y-%m") != month:
            continue

        amount = data.get("amount", 0)
        transaction_type = data.get("transactionType")
        category = data.get("category", "Uncategorized")
        note = data.get("notes", "")

        if transaction_type == "Income":
            total_income += amount
        elif transaction_type == "Expense":
            total_expenses += amount
            if category not in category_expenses:
                category_expenses[category] = {"amount": 0, "notes": []}
            category_expenses[category]["amount"] += amount
            if note:
                category_expenses[category]["notes"].append(note)

    return total_income, total_expenses, category_expenses


def check_income_vs_expense(user_id, fcm_token):
    """Check if expenses exceed 80% of income and send recommendations."""
    current_month = datetime.datetime.now().strftime("%Y-%m")
    total_income, total_expenses, category_expenses = get_income_and_expenses(user_id, current_month)

    if total_income == 0:
        return  # Avoid division by zero

    spending_ratio = total_expenses / total_income

    if spending_ratio >= 0.8:  # If spending reaches 80% of income
        print("from expense vs income")
        suggestion = get_gemini_recommendation_llm(total_income, total_expenses, category_expenses)
        message = f"You've spent 80% of your income this month. {suggestion}"
        send_notification(fcm_token, "Spending Alert!", message)

def forecast_spending(user_id, fcm_token):
    current_date = datetime.datetime.now()
    current_month = current_date.strftime("%Y-%m")
    today = current_date.day
    total_days = calendar.monthrange(current_date.year, current_date.month)[1]

    total_income, total_expenses, category_expenses = get_income_and_expenses(user_id, current_month)

    # Avoid division by zero
    if total_income <= 0 or today <= 0:
        return "Insufficient data for forecast."

    # Generate breakdown string for prompt
    category_str = ""
    for category, details in category_expenses.items():
        notes = ", ".join(details.get("notes", []))
        category_str += f"- {category}: ₹{details['amount']}" + (f" (e.g., {notes})" if notes else "") + "\n"

    # Forecast calculation
    daily_avg = total_expenses / today
    predicted_spending = daily_avg * total_days
    overspend = predicted_spending - total_income

    # Optional: Skip if no overspend
    if overspend <= 0:
        return "Spending is within budget — no alert needed."

    # Create the Gemini prompt
    forecast_prompt = (
        f"My monthly income is ₹{total_income}, and so far I've spent ₹{total_expenses} as of day {today} of {total_days} days this month.\n"
        f"Here's the breakdown of my spending by category:\n{category_str}\n"
        "Please simulate my projected end-of-month spending if I continue at the same pace.\n\n"
        "If the forecasted expense exceeds my income, give me:\n"
        "1. The projected overspending amount.\n"
        "2. A simple daily amount I should cut to stay on track.\n"
        "3. 1-2 short personalized tips using my spending categories and notes if available.\n\n"
        "Keep it concise and friendly."
    )

    try:
        response = genai.GenerativeModel("gemini-1.5-flash").generate_content(forecast_prompt)
        print(fcm_token)
        final_response = response.text.strip() if response.text else "Consider budgeting adjustments."
        send_notification(fcm_token, "Spending Forecast Alert 📊", final_response)
        return final_response
    except Exception as e:
        print("❌ Error during Gemini recommendation:", e)
        return "Error fetching suggestion. Please try again later."


def get_gemini_recommendation_llm(total_income, total_expenses, category_expenses):
    spending_ratio = total_expenses / total_income
    category_str = ""
    for category, details in category_expenses.items():
        notes = ", ".join(details.get("notes", []))
        category_str += f"- {category}: ₹{details['amount']}" + (f" (e.g., {notes})" if notes else "") + "\n"

    prompt = (
        f"Here is a summary of my spending this month:\n"
        f"- 💰 Monthly Income: ₹{total_income}\n"
        f"- 💸 Total Expenses: ₹{total_expenses}\n\n"
        f"📊 Expense Breakdown by Category:\n{category_str}\n\n"
        "Based on this data, please help with the following:\n"
        "1️⃣ Identify any non-essential or flexible spending categories.\n"
        "2️⃣ Rank them by how much they contribute to overspending.\n"
        "3️⃣ For the top 1-2 categories, give me a **short and specific** tip to reduce spending.\n\n"
        "✨ Please keep your response simple, clear, and limited to 2-3 sentences."
    )

    try:
        response = genai.GenerativeModel("gemini-1.5-flash").generate_content(prompt)
        print(response.text)
        return response.text.strip() if response.text else "Consider budgeting adjustments."

    except Exception as e:
        print("❌ Error during Gemini recommendation:", e)
        return "Error fetching suggestion. Please try again later."

def get_gemini_recommendation(category):
    """Get AI-based spending reduction tips based on overspending category."""
    prompt = f"My spending on {category} is high. Suggest one short tip (maximum one sentence) to reduce expenses in this category."
    # response = genai.GenerativeModel("gemini-1.5-pro").generate_content(prompt)

    # return response.text.strip() if response.text else "Consider budgeting adjustments."

    response = client.chat.completions.create(
        extra_body={},
        model="google/gemma-3-12b-it:free",  # Use the Gemma 3 12B model
        messages=[
            {
            "role": "user",
            "content": [
                {
                "type": "text",
                "text": prompt# Pass the prompt variable here
                }
            ]
            }
        ]
    )

    print(response.choices[0].message.content)
    return response.choices[0].message.content

def check_all_userss():
    """Check spending vs. income for all users daily."""
    users_ref = db.collection("users").stream()

    for user in users_ref:
        user_data = user.to_dict()
        fcm_token = user_data.get("fcmToken")
        
        if fcm_token:
            check_income_vs_expense(user.id, fcm_token)

def check_all_users_forecast():
    users = db.collection("users").stream()
    for user in users:
        user_id = user.id
        user_data = user.to_dict()
        fcm_token = user_data.get("fcmToken")  

        if fcm_token:
            forecast_spending(user_id, fcm_token)

# scheduler = BackgroundScheduler()
#expense vs income
# scheduler.add_job(
#     id='check_all_users_job',  # ✅ Provide a non-empty ID
#     func=check_all_userss,
#     trigger='date',
#     run_date=datetime.datetime.now()
# )
# scheduler.start()

#forecast
scheduler.add_job(
    id='check_all_users_forecast',  # ✅ Provide a non-empty ID
    func=check_all_users_forecast,
    trigger='date',
    run_date=datetime.datetime.now()
)
scheduler.start()

# 🔹 Schedule task to run daily
# scheduler = BackgroundScheduler()
# scheduler.add_job(func=check_all_users, trigger='date', run_date=datetime.datetime.now())  # Runs every 24 hours
# scheduler.start()

# Schedule job every 10 minutes
#expense vs limit
# scheduler.add_job(id="check_expense", func=check_expense_limit, trigger='date', run_date=datetime.datetime.now())
# scheduler.start()

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)

