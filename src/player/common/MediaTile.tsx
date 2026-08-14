import React, { useEffect, useState } from "react";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardActionArea from "@mui/material/CardActionArea";
import CardMedia from "@mui/material/CardMedia";
import Typography from "@mui/material/Typography";

type MediaTileProps = {
  title: string;
  image: string;
  imageHeight?: number;
  action: React.ReactNode;
  onSelect: () => void;
};

export function MediaTile({
  title,
  image,
  imageHeight,
  action,
  onSelect,
}: MediaTileProps) {
  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => {
    setImageFailed(false);
  }, [image]);

  const showImage = image && !imageFailed;

  return (
    <Card
      variant={showImage ? "elevation" : "outlined"}
      sx={{
        position: "relative",
        width: showImage ? "100%" : "fit-content",
        maxWidth: "100%",
        ...(!showImage && {
          bgcolor: "rgba(255, 255, 255, 0.04)",
          borderColor: "divider",
        }),
      }}
    >
      <CardActionArea
        onClick={onSelect}
        onKeyDown={(event) => event.stopPropagation()}
      >
        {showImage && (
          <CardMedia
            key={image}
            component="img"
            image={image}
            alt=""
            onError={() => setImageFailed(true)}
            sx={{
              display: "block",
              width: "100%",
              height: imageHeight ?? "auto",
              objectFit: imageHeight ? "cover" : "contain",
              pointerEvents: "none",
            }}
          />
        )}
        <Box
          sx={{
            p: 1.5,
            pr: 7,
            ...(showImage && {
              position: "absolute",
              right: 0,
              bottom: 0,
              left: 0,
              pt: 6,
              background:
                "linear-gradient(to top, rgba(0, 0, 0, 0.88), transparent)",
              pointerEvents: "none",
            }),
          }}
        >
          <Typography variant="body1" component="div" noWrap title={title}>
            {title}
          </Typography>
        </Box>
      </CardActionArea>
      <Box
        onKeyDown={(event) => event.stopPropagation()}
        sx={{
          position: "absolute",
          right: 0,
          bottom: 0,
          zIndex: 1,
          width: 48,
          height: 48,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {action}
      </Box>
    </Card>
  );
}
