import requests
import time

API_URL = "http://localhost:8000/api/tickets"

# Realistic support tickets to test the AI categorization and embedding clustering
TICKETS = [
    {
        "source": "Zendesk",
        "raw_content": "Hi, our entire production deployment failed today. The API is returning a 500 error on the /checkout endpoint for all users. We are losing money by the minute. Please fix ASAP!"
    },
    {
        "source": "Intercom",
        "raw_content": "Users in the EU region are complaining that the checkout page just spins forever and eventually throws an internal server error. Can someone look into this?"
    },
    {
        "source": "GitHub",
        "raw_content": "Feature request: It would be really nice if the dashboard had a dark mode option. My eyes hurt staring at the white screen all day."
    },
    {
        "source": "Email",
        "raw_content": "Hello, I am wondering if you offer enterprise discounts for teams over 50 users? Thanks."
    },
    {
        "source": "Zendesk",
        "raw_content": "URGENT: Stripe webhooks are failing in production. The payments are going through on Stripe's end, but our system isn't registering them because the webhook handler is crashing."
    }
]

print("=========================================")
print("Seeding Database via Nova API")
print("=========================================")

for i, ticket in enumerate(TICKETS):
    print(f"\n[{i+1}/{len(TICKETS)}] Ingesting ticket from {ticket['source']}...")
    try:
        start_time = time.time()
        response = requests.post(API_URL, json=ticket)
        response.raise_for_status()
        
        data = response.json()
        duration = time.time() - start_time
        
        print(f"  -> Success! (took {duration:.2f}s)")
        print(f"  -> ID       : T-{data['id']}")
        print(f"  -> Category : {data['category']}")
        print(f"  -> Urgency  : {data['urgency']}")
        print(f"  -> Sentiment: {data['sentiment_score']:.2f}")
    except Exception as e:
        print(f"  -> Error: {e}")

print("\n=========================================")
print("Seeding Complete!")
print("=========================================")
