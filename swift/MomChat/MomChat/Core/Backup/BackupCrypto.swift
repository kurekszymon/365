import CommonCrypto
import CryptoKit
import Foundation

/// The backup file: a header, then AES-GCM over the compressed archive. The key comes from her
/// password through PBKDF2-HMAC-SHA256 (CryptoKit has no password hash, CommonCrypto does).
///
///     "MOMCHATB" | version (1 byte) | iterations (UInt32, big-endian) | salt (16) | nonce (12) | ciphertext | tag (16)
///
/// The header is authenticated too, so changing the iteration count or salt also fails to open.
nonisolated enum BackupCrypto {
    enum Failure: Error, Equatable {
        case notABackup, newerVersion, wrongPassword
    }

    static let magic = Array("MOMCHATB".utf8)
    static let version: UInt8 = 1
    /// OWASP's 2023 figure for PBKDF2-SHA256. About half a second on a recent iPhone.
    static let defaultIterations: UInt32 = 600_000
    /// A damaged or crafted file mustn't make the phone hash for minutes.
    static let maxIterations: UInt32 = 5_000_000
    static let saltLength = 16
    static let headerLength = magic.count + 1 + 4 + saltLength
    /// Nonce + tag.
    private static let sealOverhead = 12 + 16

    static func seal(_ plaintext: Data, password: String, iterations: UInt32 = defaultIterations) throws -> Data {
        var salt = [UInt8](repeating: 0, count: saltLength)
        var generator = SystemRandomNumberGenerator()
        for index in salt.indices { salt[index] = generator.next() }

        let header = Data(magic + [version] + withUnsafeBytes(of: iterations.bigEndian, Array.init) + salt)
        let key = try deriveKey(password: password, salt: salt, iterations: iterations)
        let box = try AES.GCM.seal(plaintext, using: key, authenticating: header)
        guard let combined = box.combined else { throw CryptoKitError.incorrectParameterSize }
        return header + combined
    }

    static func open(_ file: Data, password: String) throws -> Data {
        let bytes = [UInt8](file)
        guard bytes.count >= headerLength + sealOverhead, Array(bytes.prefix(magic.count)) == magic else {
            throw Failure.notABackup
        }
        let fileVersion = bytes[magic.count]
        guard fileVersion != 0 else { throw Failure.notABackup }
        guard fileVersion <= version else { throw Failure.newerVersion }

        let iterationsStart = magic.count + 1
        let iterations = bytes[iterationsStart..<iterationsStart + 4].reduce(UInt32(0)) { $0 << 8 | UInt32($1) }
        guard (1...maxIterations).contains(iterations) else { throw Failure.notABackup }
        let salt = Array(bytes[iterationsStart + 4..<headerLength])

        let key = try deriveKey(password: password, salt: salt, iterations: iterations)
        do {
            let box = try AES.GCM.SealedBox(combined: Data(bytes[headerLength...]))
            return try AES.GCM.open(box, using: key, authenticating: Data(bytes.prefix(headerLength)))
        } catch {
            // GCM can't tell a wrong password from a damaged file.
            throw Failure.wrongPassword
        }
    }

    /// The password is normalized first, so "ż" typed as one character or as "z" + accent gives the same key.
    static func deriveKey(password: String, salt: [UInt8], iterations: UInt32) throws -> SymmetricKey {
        let password = Array(password.precomposedStringWithCanonicalMapping.utf8)
        var derived = [UInt8](repeating: 0, count: 32)
        let status = password.withUnsafeBufferPointer { passwordBytes in
            passwordBytes.withMemoryRebound(to: CChar.self) { passwordChars in
                CCKeyDerivationPBKDF(
                    CCPBKDFAlgorithm(kCCPBKDF2),
                    passwordChars.baseAddress, passwordChars.count,
                    salt, salt.count,
                    CCPseudoRandomAlgorithm(kCCPRFHmacAlgSHA256),
                    iterations,
                    &derived, derived.count
                )
            }
        }
        guard status == kCCSuccess else { throw CryptoKitError.incorrectParameterSize }
        return SymmetricKey(data: derived)
    }
}
