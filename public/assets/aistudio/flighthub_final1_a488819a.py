import mysql.connector as mysql
from datetime import datetime, timedelta

# Connect to MySQL
conn = mysql.connect(host="localhost", user="root", password="root")
cursor = conn.cursor(buffered=True)

# Create and use database
cursor.execute("CREATE DATABASE IF NOT EXISTS flighthub")
cursor.execute("USE flighthub")

# Booking table - one entry per passenger
cursor.execute("""
CREATE TABLE IF NOT EXISTS Booking_Details(
    Booking_ID VARCHAR(255) PRIMARY KEY,
    Name_of_Ticketholder VARCHAR(255),
    Citizenship VARCHAR(255),
    Seat_Preference VARCHAR(20),
    Seat_Booked VARCHAR(10),
    Airline VARCHAR(255),
    Airline_Code VARCHAR(10),
    Departure_DateandTime DATETIME,
    Departure_Airport VARCHAR(10),
    Arrival_DateandTime DATETIME,
    Arrival_Airport VARCHAR(10),
    Fare DECIMAL(10,2)
)
""")

# Seat table
cursor.execute("""
CREATE TABLE IF NOT EXISTS Seats(
    Seat_Number VARCHAR(10) PRIMARY KEY,
    Seat_Type VARCHAR(20),
    Is_Booked BOOLEAN DEFAULT FALSE,
    Booking_ID VARCHAR(255)
)
""")
conn.commit()

# Airlines
airlines = [
    {"name": "SkyJet Airways", "code": "SJ", "rating": 4.3, "fare": 4500},
    {"name": "BlueHorizon Airlines", "code": "BH", "rating": 3.9, "fare": 4000},
    {"name": "AeroNova", "code": "AN", "rating": 4.7, "fare": 5500},
    {"name": "SunVista Air", "code": "SV", "rating": 3.6, "fare": 3500},
    {"name": "CloudNine Aviation", "code": "CN", "rating": 4.8, "fare": 6000},
    {"name": "Global Wings", "code": "GW", "rating": 3.4, "fare": 3000}
]

available_times = ["06:00", "09:00", "12:00", "15:00", "18:00", "21:00"]

# Create 180 seats: 1A to 30F
for row in range(1, 31):
    for letter, seat_type in [("A", "Window"), ("B", "Middle"), ("C", "Aisle"), ("D", "Aisle"), ("E", "Middle"), ("F", "Window")]:
        cursor.execute("INSERT IGNORE INTO Seats(Seat_Number, Seat_Type) VALUES(%s, %s)", (f"{row}{letter}", seat_type))
conn.commit()

# SEAT ALLOCATION
def allocate_seat(preference):
    if preference != "No Preference":
        cursor.execute("""
        SELECT Seat_Number FROM Seats WHERE Seat_Type=%s AND Is_Booked=FALSE
        ORDER BY CAST(SUBSTRING(Seat_Number,1,LENGTH(Seat_Number)-1) AS UNSIGNED), Seat_Number LIMIT 1
        """, (preference,))
        preferred = cursor.fetchone()
        if preferred:
            return preferred[0], True

    cursor.execute("""
    SELECT Seat_Number FROM Seats WHERE Is_Booked=FALSE
    ORDER BY CAST(SUBSTRING(Seat_Number,1,LENGTH(Seat_Number)-1) AS UNSIGNED), Seat_Number LIMIT 1
    """)
    available = cursor.fetchone()
    if available:
        return available[0], False
    return None, False

# NEW TICKET
def new_ticket():
    print("\n===== NEW TICKET =====")
    departure_airport = input("Enter departure airport code: ").upper()
    arrival_airport = input("Enter arrival airport code: ").upper()

    print("\nAvailable Airlines:")
    for i, airline in enumerate(airlines, 1):
        print(f"{i}. {airline['name']} | Code: {airline['code']} | Rating: {airline['rating']}/5 | Fare: Rs.{airline['fare']}")

    while True:
        try:
            airline_choice = int(input("\nSelect an airline (1-6): "))
            if 1 <= airline_choice <= len(airlines):
                break
            print("Enter a number between 1 and 6.")
        except ValueError:
            print("Enter a valid number.")

    airline = airlines[airline_choice - 1]

    while True:
        travel_date = input("\nEnter travel date (YYYY-MM-DD): ")
        try:
            datetime.strptime(travel_date, "%Y-%m-%d")
            break
        except ValueError:
            print("Invalid date. Use YYYY-MM-DD.")

    print("\nAvailable Departure Times:")
    for i, time in enumerate(available_times, 1):
        print(f"{i}. {time}")

    while True:
        try:
            time_choice = int(input("\nSelect departure time (1-6): "))
            if 1 <= time_choice <= len(available_times):
                break
            print("Enter a number between 1 and 6.")
        except ValueError:
            print("Enter a valid number.")

    departure_time = available_times[time_choice - 1]
    departure_datetime = datetime.strptime(f"{travel_date} {departure_time}", "%Y-%m-%d %H:%M")
    arrival_datetime = departure_datetime + timedelta(hours=3)

    while True:
        try:
            passenger_count = int(input("\nHow many passengers? "))
            if passenger_count > 0:
                break
            print("There must be at least one passenger.")
        except ValueError:
            print("Enter a valid number.")

    passengers = []
    for i in range(1, passenger_count + 1):
        print(f"\n--- Passenger {i} ---")
        name = input("Enter passenger name: ")
        citizenship = input("Enter nationality: ")
        print("\nSeat Preference:\n1. Window\n2. Middle\n3. Aisle\n4. No Preference")

        while True:
            try:
                preference_choice = int(input("Select preference (1-4): "))
                if 1 <= preference_choice <= 4:
                    break
                print("Select 1-4.")
            except ValueError:
                print("Enter a valid number.")

        preferences = ["Window", "Middle", "Aisle", "No Preference"]
        preference = preferences[preference_choice - 1]
        passengers.append((name, citizenship, preference))

    cursor.execute("SELECT COUNT(*) FROM Seats WHERE Is_Booked=FALSE")
    free_seats = cursor.fetchone()[0]
    if free_seats < passenger_count:
        print("\nNot enough seats available.")
        return

    print("\n===== BOOKING SUMMARY =====")
    for i, passenger in enumerate(passengers, 1):
        print(f"{i}. {passenger[0]} | {passenger[2]}")

    confirm = input("\nConfirm booking? (Y/N): ").upper()
    if confirm != "Y":
        print("Booking cancelled.")
        return

    created_bookings = []
    try:
        for number, passenger in enumerate(passengers, 1):
            name, citizenship, preference = passenger
            booking_id = airline["code"] + departure_datetime.strftime("%Y%m%d%H%M") + f"{number:02d}"

            cursor.execute("SELECT Booking_ID FROM Booking_Details WHERE Booking_ID=%s", (booking_id,))
            if cursor.fetchone():
                booking_id = airline["code"] + departure_datetime.strftime("%Y%m%d%H%M") + datetime.now().strftime("%f") + f"{number:02d}"

            seat, preference_met = allocate_seat(preference)
            if seat is None:
                raise Exception("No seats available.")

            cursor.execute("UPDATE Seats SET Is_Booked=TRUE, Booking_ID=%s WHERE Seat_Number=%s", (booking_id, seat))
            cursor.execute("""
            INSERT INTO Booking_Details(
                Booking_ID, Name_of_Ticketholder, Citizenship, Seat_Preference, Seat_Booked,
                Airline, Airline_Code, Departure_DateandTime, Departure_Airport,
                Arrival_DateandTime, Arrival_Airport, Fare
            ) VALUES(%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """, (booking_id, name, citizenship, preference, seat, airline["name"], airline["code"], departure_datetime, departure_airport, arrival_datetime, arrival_airport, airline["fare"]))

            created_bookings.append((booking_id, name, preference, seat, preference_met))

        conn.commit()

        print("\n===== BOOKING CONFIRMED =====")
        for booking in created_bookings:
            bid, name, preference, seat, preference_met = booking
            print(f"\nPassenger        : {name}")
            print(f"Booking ID       : {bid}")
            print(f"Seat Preference  : {preference}")
            print(f"Seat Booked      : {seat}")
            if preference == "No Preference":
                print("Preference Status: Any available seat assigned")
            elif preference_met:
                print("Preference Status: Preferred seat assigned")
            else:
                print("Preference Status: Preferred seat unavailable; alternative seat assigned")

        print(f"\nAirline           : {airline['name']}")
        print(f"Departure         : {departure_airport}")
        print(f"Departure Time    : {departure_datetime}")
        print(f"Arrival           : {arrival_airport}")
        print(f"Arrival Time      : {arrival_datetime}")
        print(f"Fare per Passenger: Rs.{airline['fare']}")
        print(f"Total Fare        : Rs.{airline['fare'] * passenger_count}")

    except Exception as error:
        conn.rollback()
        print("\nBooking failed:", error)

# VIEW TICKET
def display_ticket(ticket):
    print("\n===== TICKET =====")
    print(f"Booking ID       : {ticket[0]}")
    print(f"Passenger        : {ticket[1]}")
    print(f"Citizenship      : {ticket[2]}")
    print(f"Seat Preference  : {ticket[3]}")
    print(f"Seat Booked      : {ticket[4]}")
    print(f"Airline          : {ticket[5]}")
    print(f"Airline Code     : {ticket[6]}")
    print(f"Departure        : {ticket[8]}")
    print(f"Departure Time   : {ticket[7]}")
    print(f"Arrival          : {ticket[10]}")
    print(f"Arrival Time     : {ticket[9]}")
    print(f"Fare             : Rs.{ticket[11]}")

def view_ticket():
    print("\n===== VIEW TICKET =====")
    print("1. Search by Booking ID")
    print("2. Search by Passenger Name")

    try:
        choice = int(input("Enter choice: "))
    except ValueError:
        print("Invalid choice.")
        return

    if choice == 1:
        booking_id = input("Enter Booking ID: ").upper()
        cursor.execute("""
        SELECT Booking_ID, Name_of_Ticketholder, Citizenship, Seat_Preference, Seat_Booked,
               Airline, Airline_Code, Departure_DateandTime, Departure_Airport,
               Arrival_DateandTime, Arrival_Airport, Fare
        FROM Booking_Details WHERE Booking_ID=%s
        """, (booking_id,))

        ticket = cursor.fetchone()
        if ticket:
            display_ticket(ticket)
        else:
            print("Booking not found.")

    elif choice == 2:
        name = input("Enter passenger name: ").strip()
        cursor.execute("""
        SELECT Booking_ID, Name_of_Ticketholder, Citizenship, Seat_Preference, Seat_Booked,
               Airline, Airline_Code, Departure_DateandTime, Departure_Airport,
               Arrival_DateandTime, Arrival_Airport, Fare
        FROM Booking_Details WHERE LOWER(Name_of_Ticketholder)=LOWER(%s)
        """, (name,))

        tickets = cursor.fetchall()
        if not tickets:
            print("No ticket found for that passenger.")
            return

        if len(tickets) == 1:
            display_ticket(tickets[0])
            return

        print("\nMultiple tickets found for this passenger:")
        for ticket in tickets:
            print(f"Booking ID: {ticket[0]} | Flight: {ticket[5]} | Date: {ticket[7]} | Seat: {ticket[4]}")

        last_four = input("\nEnter last 4 digits of Booking ID: ").strip()
        matching = [ticket for ticket in tickets if ticket[0][-4:] == last_four]

        if len(matching) == 1:
            display_ticket(matching[0])
        elif len(matching) > 1:
            print("More than one ticket matches those digits.")
        else:
            print("No ticket found with that name and last 4 Booking ID digits.")
    else:
        print("Invalid choice.")

# CANCEL TICKET
def cancel_ticket():
    print("\n===== CANCEL TICKET =====")
    booking_id = input("Enter Booking ID: ").upper()

    cursor.execute("SELECT Name_of_Ticketholder, Seat_Booked FROM Booking_Details WHERE Booking_ID=%s", (booking_id,))
    booking = cursor.fetchone()

    if booking is None:
        print("Booking not found.")
        return

    print(f"Passenger : {booking[0]}")
    print(f"Seat      : {booking[1]}")

    confirm = input("Are you sure you want to cancel? (Y/N): ").upper()
    if confirm != "Y":
        print("Cancellation aborted.")
        return

    try:
        cursor.execute("UPDATE Seats SET Is_Booked=FALSE, Booking_ID=NULL WHERE Seat_Number=%s", (booking[1],))
        cursor.execute("DELETE FROM Booking_Details WHERE Booking_ID=%s", (booking_id,))
        conn.commit()

        print("Ticket cancelled successfully.")
        print(f"Seat {booking[1]} is now available.")
    except mysql.Error as error:
        conn.rollback()
        print("Cancellation failed:", error)

# VIEW FARES
def view_fares():
    print("\n===== FLIGHT FARES =====")
    print(f"{'No.':<5}{'Airline':<27}{'Code':<8}{'Rating':<10}{'Fare'}")
    print("-" * 65)

    for i, airline in enumerate(airlines, 1):
        print(f"{i:<5}{airline['name']:<27}{airline['code']:<8}{airline['rating']:<10}Rs.{airline['fare']}")

# MAIN MENU
while True:
    print("\n===== FLIGHTHUB =====")
    print("1. New Ticket\n2. View Ticket\n3. Cancel Ticket\n4. View Fares\n5. Exit")

    try:
        choice = int(input("Enter your choice: "))
    except ValueError:
        print("Please enter a valid number.")
        continue

    if choice == 1:
        new_ticket()
    elif choice == 2:
        view_ticket()
    elif choice == 3:
        cancel_ticket()
    elif choice == 4:
        view_fares()
    elif choice == 5:
        print("Thank you for using FlightHub!")
        cursor.close()
        conn.close()
        break
    else:
        print("Invalid choice. Please select 1-5.")