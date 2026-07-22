function AvatarDisplay({ avatarUrl, username, size = "md", className = "" }) {
  const initials = (username || "?").substring(0, 2).toUpperCase();

  const sizeClasses = {
    sm: "w-8 h-8 text-xs",
    md: "w-12 h-12 text-sm",
    lg: "w-16 h-16 text-lg",
    xl: "w-24 h-24 text-2xl",
  };

  return (
    <div
      className={`${sizeClasses[size]} ${className} rounded-lg overflow-hidden flex items-center justify-center font-bold bg-gradient-to-br from-emerald-600 to-emerald-700 text-white flex-shrink-0`}
    >
      {avatarUrl ? (
        <img
          src={avatarUrl}
          alt={username}
          className="w-full h-full object-cover"
          onError={(e) => {
            // Si la imagen falla, mostrar iniciales
            e.target.style.display = "none";
            e.target.nextSibling.style.display = "flex";
          }}
        />
      ) : null}
      {!avatarUrl ? (
        <span>{initials}</span>
      ) : (
        <span style={{ display: "none" }}>{initials}</span>
      )}
    </div>
  );
}

export default AvatarDisplay;
