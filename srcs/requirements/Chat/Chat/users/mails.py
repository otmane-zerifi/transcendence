from django.core.mail import send_mail

def send_verification_email(email, verification_link):
    subject = 'Verify your email address'
    message = f"Click on the following link to verify your email: {verification_link}"
    send_mail(subject, message, 'chicmodeactivated@gmail.com', [email])

def send_otp_email(email, verification_link, otp_code):
    subject = 'Your OTP Code'
    message = f"This is your One-Time Password (OTP): {otp_code}\n \
        PS-1: Valid for 5 minutes!\n \
        PS-2: You can follow this link {verification_link}"
    send_mail(subject, message, 'chicmodeactivated@gmail.com', [email])
