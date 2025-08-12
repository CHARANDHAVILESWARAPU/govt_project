@@ .. @@
 -- Insert sample housing schemes
 INSERT INTO housing_schemes (scheme_name, scheme_code, description, max_income_limit, subsidy_amount) VALUES 
 ('Pradhan Mantri Awas Yojana', 'PMAY', 'Housing for All scheme by Government of India', 600000.00, 250000.00),
 ('AP Housing Scheme', 'APHS', 'State government housing scheme for economically weaker sections', 300000.00, 150000.00),
 ('Rural Housing Scheme', 'RHS', 'Housing scheme for rural areas', 200000.00, 120000.00);

+-- Create registrations table for new registration process
+CREATE TABLE registrations (
+    id INT PRIMARY KEY AUTO_INCREMENT,
+    application_id VARCHAR(20) UNIQUE NOT NULL,
+    full_name VARCHAR(100) NOT NULL,
+    father_name VARCHAR(100) NOT NULL,
+    aadhar_number VARCHAR(12) UNIQUE NOT NULL,
+    phone_number VARCHAR(10) NOT NULL,
+    email VARCHAR(100) NOT NULL,
+    constitution VARCHAR(50) NOT NULL,
+    state VARCHAR(50) NOT NULL,
+    district VARCHAR(50) NOT NULL,
+    city VARCHAR(50) NOT NULL,
+    mandal VARCHAR(50) NOT NULL,
+    village VARCHAR(50) NOT NULL,
+    pincode VARCHAR(6) NOT NULL,
+    status ENUM('pending_payment', 'paid', 'under_review', 'approved', 'rejected') DEFAULT 'pending_payment',
+    payment_status ENUM('pending', 'completed', 'failed') DEFAULT 'pending',
+    otp_verified BOOLEAN DEFAULT FALSE,
+    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
+    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
+);
+
+-- Create payments table
+CREATE TABLE payments (
+    id INT PRIMARY KEY AUTO_INCREMENT,
+    transaction_id VARCHAR(50) UNIQUE NOT NULL,
+    application_id VARCHAR(20) NOT NULL,
+    amount DECIMAL(10,2) NOT NULL,
+    payment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
+    status ENUM('pending', 'success', 'failed') DEFAULT 'pending',
+    payment_method VARCHAR(50) NOT NULL,
+    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
+    FOREIGN KEY (application_id) REFERENCES registrations(application_id)
+);
+
+-- Create admin applications table for admin panel
+CREATE TABLE admin_applications (
+    id INT PRIMARY KEY AUTO_INCREMENT,
+    application_id VARCHAR(20) UNIQUE NOT NULL,
+    full_name VARCHAR(100) NOT NULL,
+    phone_number VARCHAR(10) NOT NULL,
+    email VARCHAR(100) NOT NULL,
+    district VARCHAR(50) NOT NULL,
+    transaction_id VARCHAR(50) NOT NULL,
+    amount_paid DECIMAL(10,2) NOT NULL,
+    status ENUM('new', 'reviewed', 'approved', 'rejected') DEFAULT 'new',
+    reviewed_by INT NULL,
+    reviewed_at TIMESTAMP NULL,
+    remarks TEXT,
+    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
+    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
+    FOREIGN KEY (reviewed_by) REFERENCES users(id)
+);
+
 -- Create indexes for better performance
@@ .. @@
 CREATE INDEX idx_beneficiaries_status ON beneficiaries(status);
+CREATE INDEX idx_registrations_aadhar ON registrations(aadhar_number);
+CREATE INDEX idx_registrations_phone ON registrations(phone_number);
+CREATE INDEX idx_registrations_status ON registrations(status);
+CREATE INDEX idx_payments_transaction ON payments(transaction_id);
+CREATE INDEX idx_payments_application ON payments(application_id);
+CREATE INDEX idx_admin_applications_status ON admin_applications(status);
@@ .. @@