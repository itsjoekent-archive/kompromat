## Authentication & Encryption Process

Kompromat encrypts all passwords in "the vault" using the AES-256-CBC algorithm with a 32 byte key ("vault key"). The vault key is never stored in plaintext, it is never transmitted to the user.

When Kompromat is installed and used for the first time, it prompts the user for a 6 digit login pin. Kompromat then generates the default access card for the vault. The access card has a unique UUIDv4 identifier, and a 250 bit secret ("access card secret"), which are both transmitted to the user upon creation. They are to be encoded within a QR code that the Kompromat application can scan & decode. These fields cannot be edited, and the access card secret is not stored on disk so it cannot be retrieved later.

The access card additionally has two encrypted fields. The encryption key for these fields is the access card secret and 6 digit login pin. The first encrypted field is a static string, "kompromat", which is used as a challenge later in the authentication process. The second encrypted field is the vault key.

When a user presents their access card id, access card secret, and pin, Kompromat verifies there is an access card on disk with the matching identifier. It then decrypts the challenge, using the access card secret and pin, associated with the given access card id to verify the output is "kompromat". Finally, using the same decryption key, it decrypts the vault key stored stored on the access card record. The vault key remains in memory as now Kompromat must create a short lived token that will persist in the users application.

The token has a 32 byte random identifier, and a 32 byte random access secret, which are transmitted to the user. The token has a 5 minute expiration, after which the application will reject it and eventually remove the record from disk. The token stores two fields that are encrypted with the access secret, a challenge string ("kompromat"), and the vault key.

When a user makes an API request to the application, they must present both the token id and access secret. Kompromat will verify a token record exists for the given id, and will attempt to decrypt the challenge with the given access secret. If this is successful, it can decrypt the vault key stored alongside the token and use it for database operations. The vault key remains in memory only.
