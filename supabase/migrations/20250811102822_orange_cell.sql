-- Government Housing Portal Database Schema

CREATE DATABASE IF NOT EXISTS housing_portal;
USE housing_portal;

-- Users table for admin and worker authentication
CREATE TABLE users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    user_type ENUM('admin', 'worker') NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    phone VARCHAR(15),
    status ENUM('active', 'inactive', 'suspended') DEFAULT 'active',
    last_login TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Applications table for housing applications
CREATE TABLE applications (
    id INT PRIMARY KEY AUTO_INCREMENT,
    application_id VARCHAR(20) UNIQUE NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    aadhar_number VARCHAR(12) UNIQUE NOT NULL,
    phone_number VARCHAR(10) NOT NULL,
    email VARCHAR(100) NOT NULL,
    district VARCHAR(50) NOT NULL,
    income_range VARCHAR(20) NOT NULL,
    address TEXT NOT NULL,
    status ENUM('pending', 'under_review', 'approved', 'rejected', 'completed') DEFAULT 'pending',
    otp VARCHAR(6),
    otp_expires_at TIMESTAMP NULL,
    otp_verified BOOLEAN DEFAULT FALSE,
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    reviewed_at TIMESTAMP NULL,
    reviewed_by INT NULL,
    remarks TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (reviewed_by) REFERENCES users(id)
);

-- OTP logs table for tracking OTP requests
CREATE TABLE otp_logs (
    id INT PRIMARY KEY AUTO_INCREMENT,
    phone_number VARCHAR(10) NOT NULL,
    otp VARCHAR(6) NOT NULL,
    purpose ENUM('application', 'login', 'verification') NOT NULL,
    status ENUM('sent', 'verified', 'expired', 'failed') DEFAULT 'sent',
    ip_address VARCHAR(45),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    verified_at TIMESTAMP NULL
);

-- Contact messages table
CREATE TABLE contact_messages (
    id INT PRIMARY KEY AUTO_INCREMENT,
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    email VARCHAR(100) NOT NULL,
    phone VARCHAR(15) NOT NULL,
    subject VARCHAR(100) NOT NULL,
    message TEXT NOT NULL,
    status ENUM('new', 'read', 'replied', 'closed') DEFAULT 'new',
    ip_address VARCHAR(45),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Documents table for application documents
CREATE TABLE documents (
    id INT PRIMARY KEY AUTO_INCREMENT,
    application_id INT NOT NULL,
    document_type VARCHAR(50) NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_size INT NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE CASCADE
);

-- Activity logs table for audit trail
CREATE TABLE activity_logs (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT,
    user_type VARCHAR(20) NOT NULL,
    action VARCHAR(100) NOT NULL,
    details TEXT,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Districts table for reference
CREATE TABLE districts (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(50) NOT NULL,
    code VARCHAR(10) UNIQUE NOT NULL,
    region VARCHAR(50),
    population INT,
    area_sq_km DECIMAL(10,2),
    headquarters VARCHAR(50),
    status ENUM('active', 'inactive') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Housing schemes table
CREATE TABLE housing_schemes (
    id INT PRIMARY KEY AUTO_INCREMENT,
    scheme_name VARCHAR(100) NOT NULL,
    scheme_code VARCHAR(20) UNIQUE NOT NULL,
    description TEXT,
    eligibility_criteria TEXT,
    benefits TEXT,
    max_income_limit DECIMAL(10,2),
    subsidy_amount DECIMAL(10,2),
    status ENUM('active', 'inactive', 'suspended') DEFAULT 'active',
    start_date DATE,
    end_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Application scheme mapping
CREATE TABLE application_schemes (
    id INT PRIMARY KEY AUTO_INCREMENT,
    application_id INT NOT NULL,
    scheme_id INT NOT NULL,
    applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE CASCADE,
    FOREIGN KEY (scheme_id) REFERENCES housing_schemes(id)
);

-- Beneficiaries table for approved applications
CREATE TABLE beneficiaries (
    id INT PRIMARY KEY AUTO_INCREMENT,
    application_id INT UNIQUE NOT NULL,
    beneficiary_id VARCHAR(20) UNIQUE NOT NULL,
    allotment_date DATE,
    house_number VARCHAR(50),
    project_name VARCHAR(100),
    project_location VARCHAR(200),
    possession_date DATE,
    status ENUM('allotted', 'under_construction', 'ready', 'handed_over') DEFAULT 'allotted',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (application_id) REFERENCES applications(id)
);

-- Insert default admin user
INSERT INTO users (username, email, password, user_type, full_name, phone) VALUES 
('admin', 'admin@aphc.gov.in', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin', 'System Administrator', '9999999999');

-- Insert sample worker
INSERT INTO users (username, email, password, user_type, full_name, phone) VALUES 
('WRK001', 'worker1@aphc.gov.in', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'worker', 'Field Worker 1', '9999999998');

-- Insert districts
INSERT INTO districts (name, code, region, headquarters) VALUES 
('Anantapur', 'ATP', 'Rayalaseema', 'Anantapur'),
('Chittoor', 'CTR', 'Rayalaseema', 'Chittoor'),
('East Godavari', 'EG', 'Coastal Andhra', 'Kakinada'),
('Guntur', 'GTR', 'Coastal Andhra', 'Guntur'),
('Krishna', 'KRS', 'Coastal Andhra', 'Machilipatnam'),
('Kurnool', 'KNL', 'Rayalaseema', 'Kurnool'),
('Prakasam', 'PKM', 'Coastal Andhra', 'Ongole'),
('Srikakulam', 'SKL', 'Coastal Andhra', 'Srikakulam'),
('Visakhapatnam', 'VSP', 'Coastal Andhra', 'Visakhapatnam'),
('Vizianagaram', 'VZM', 'Coastal Andhra', 'Vizianagaram'),
('West Godavari', 'WG', 'Coastal Andhra', 'Eluru'),
('YSR Kadapa', 'YSR', 'Rayalaseema', 'Kadapa'),
('Nellore', 'NLR', 'Coastal Andhra', 'Nellore');

-- Insert sample housing schemes
INSERT INTO housing_schemes (scheme_name, scheme_code, description, max_income_limit, subsidy_amount) VALUES 
('Pradhan Mantri Awas Yojana', 'PMAY', 'Housing for All scheme by Government of India', 600000.00, 250000.00),
('AP Housing Scheme', 'APHS', 'State government housing scheme for economically weaker sections', 300000.00, 150000.00),
('Rural Housing Scheme', 'RHS', 'Housing scheme for rural areas', 200000.00, 120000.00);

-- Create indexes for better performance
CREATE INDEX idx_applications_aadhar ON applications(aadhar_number);
CREATE INDEX idx_applications_phone ON applications(phone_number);
CREATE INDEX idx_applications_status ON applications(status);
CREATE INDEX idx_applications_district ON applications(district);
CREATE INDEX idx_otp_logs_phone ON otp_logs(phone_number);
CREATE INDEX idx_otp_logs_created ON otp_logs(created_at);
CREATE INDEX idx_activity_logs_user ON activity_logs(user_id, user_type);
CREATE INDEX idx_activity_logs_created ON activity_logs(created_at);
CREATE INDEX idx_contact_messages_status ON contact_messages(status);
CREATE INDEX idx_beneficiaries_status ON beneficiaries(status);

-- Create views for reporting
CREATE VIEW application_summary AS
SELECT 
    a.id,
    a.application_id,
    a.full_name,
    a.phone_number,
    a.email,
    a.district,
    a.status,
    a.submitted_at,
    u.full_name as reviewed_by_name,
    a.reviewed_at
FROM applications a
LEFT JOIN users u ON a.reviewed_by = u.id;

CREATE VIEW district_statistics AS
SELECT 
    d.name as district_name,
    COUNT(a.id) as total_applications,
    SUM(CASE WHEN a.status = 'pending' THEN 1 ELSE 0 END) as pending_applications,
    SUM(CASE WHEN a.status = 'approved' THEN 1 ELSE 0 END) as approved_applications,
    SUM(CASE WHEN a.status = 'rejected' THEN 1 ELSE 0 END) as rejected_applications
FROM districts d
LEFT JOIN applications a ON d.name = a.district
GROUP BY d.id, d.name;

-- Create stored procedures
DELIMITER //

CREATE PROCEDURE GetApplicationStats()
BEGIN
    SELECT 
        COUNT(*) as total_applications,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN status = 'under_review' THEN 1 ELSE 0 END) as under_review,
        SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as approved,
        SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as rejected,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed
    FROM applications;
END //

CREATE PROCEDURE GetMonthlyApplications()
BEGIN
    SELECT 
        DATE_FORMAT(submitted_at, '%Y-%m') as month,
        COUNT(*) as applications_count
    FROM applications 
    WHERE submitted_at >= DATE_SUB(NOW(), INTERVAL 12 MONTH)
    GROUP BY DATE_FORMAT(submitted_at, '%Y-%m')
    ORDER BY month;
END //

DELIMITER ;

-- Create triggers for audit logging
DELIMITER //

CREATE TRIGGER application_status_change 
AFTER UPDATE ON applications
FOR EACH ROW
BEGIN
    IF OLD.status != NEW.status THEN
        INSERT INTO activity_logs (user_id, user_type, action, details, created_at)
        VALUES (NEW.reviewed_by, 'system', 'APPLICATION_STATUS_CHANGED', 
                CONCAT('Application ', NEW.application_id, ' status changed from ', OLD.status, ' to ', NEW.status), NOW());
    END IF;
END //

DELIMITER ;