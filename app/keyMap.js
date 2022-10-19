// Used for optimized bandwidth and storage eval.
var optimizedKeyMap = {
    "vcr_key":               "a",
    "client_id_cookie":      "b",
    "vcr_challenge":         "c",
    "cookie_wrapper":        "d",
    "server_public_key":     "e",
    "vcr":                   "f",
    "action":                "g",
    "metadata":              "h",
    "encryption_public_key": "i",
    "signature":             "j",
    "derivation_path":       "k",
    "url_origin":            "l",
    "history":               "m",
    "date":                  "n",
    "path":                  "o",
    "vcr_request_endpoint":  "p",
    "vcr_verify_endpoint":   "q"
};

// Used for baselize bandwidth and storage eval.
var unoptimizedKeyMap = {
    "vcr_key":               "vcr_key"              ,
    "client_id_cookie":      "client_id_cookie"     ,
    "vcr_challenge":         "vcr_challenge"        ,
    "cookie_wrapper":        "cookie_wrapper"       ,
    "server_public_key":     "server_public_key"    ,
    "vcr":                   "vcr"                  ,
    "action":                "action"               ,
    "metadata":              "metadata"             ,
    "encryption_public_key": "encryption_public_key",
    "signature":             "signature"            ,
    "derivation_path":       "derivation_path"      ,
    "url_origin":            "url_origin"           ,
    "history":               "history"              ,
    "date":                  "date"                 ,
    "path":                  "path"                 ,
    "vcr_request_endpoint":  "vcr_request_endpoint" ,
    "vcr_verify_endpoint":   "vcr_verify_endpoint"  
};

var optimized = false;
var keyMap = optimized ? optimizedKeyMap : unoptimizedKeyMap;
